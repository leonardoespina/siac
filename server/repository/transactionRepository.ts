import { prisma } from '../utils/prisma'
import { NotFoundError, ValidationError } from '../domain/errors'
import { validateStateTransition, validateApproval, type TransactionStatus, type UserContext } from '../domain/transaction'

// ── LÓGICA DE CONSUMO Y MERMAS (LOCAL) ───────────────────────────────────

export async function createConsumption(data: any, user: UserContext, type: 'CONSUMPTION' | 'LOSS' | 'SUPPORT' = 'CONSUMPTION') {
  if (!user.warehouseId) {
    throw new ValidationError('No tienes un almacén/comedor asignado para registrar despachos.')
  }

  // REGLA 4 FLEXIBILIZADA: El turno solo es obligatorio para CONSUMPTION.
  const activeShift = await prisma.shift.findFirst({
    where: { warehouseId: user.warehouseId, status: 'OPEN' }
  })

  if (type === 'CONSUMPTION' && !activeShift) {
    throw new ValidationError('No puedes registrar consumos porque no tienes un turno abierto en tu comedor.')
  }

  // VALIDACIÓN ATÓMICA DE STOCK EN CREACIÓN (Evitar stock negativo)
  const currentStocks = await prisma.stock.findMany({
    where: { warehouseId: user.warehouseId, productId: { in: data.details.map((d: any) => d.productId) } }
  })
  const stockMap = new Map(currentStocks.map(s => [s.productId, s]))

  for (const detail of data.details) {
    const current = stockMap.get(detail.productId)
    if (!current || Number(current.quantity) < detail.quantity) {
      throw new ValidationError(`Stock insuficiente para el producto ID ${detail.productId}. Tienes ${current ? current.quantity : 0}, intentas registrar ${detail.quantity}.`)
    }
  }

  // 1. Obtener los precios promedio vigentes para congelarlos
  const productIds = data.details.map((d: any) => d.productId)
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, referencePrice: true }
  })
  const priceMap = new Map(products.map(p => [p.id, Number(p.referencePrice)]))

  const newTx = await prisma.transaction.create({
    data: {
      type,
      status: 'DRAFT',
      sourceId: user.warehouseId,
      createdById: user.id,
      shiftId: activeShift ? activeShift.id : null,
      institutionId: data.institutionId || null,
      details: {
        create: data.details.map((d: any) => ({
          productId: d.productId,
          quantity: d.quantity,
          unitPrice: Number(d.unitPrice) > 0 ? Number(d.unitPrice) : (priceMap.get(d.productId) || 0)
        }))
      }
    },
    include: { 
      details: { include: { product: { include: { unit: true } } } },
      destination: true,
      source: true,
      supplier: true,
      institution: true,
      createdBy: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, name: true } }
    }
  })
  
  emitEvent('transaction:sync', { action: 'create', transaction: newTx })
  return newTx
}

// ── LÓGICA GENERAL DE TRANSACCIONES ──────────────────────────────────────
export async function listReceptions() {
  return prisma.transaction.findMany({
    where: { type: 'RECEPTION' },
    include: {
      destination: true,
      supplier: true,
      createdBy: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, name: true } },
      details: {
        include: { product: { include: { unit: true } } }
      }
    },
    orderBy: { createdAt: 'desc' }
  })
}

export async function listConsumptions(warehouseId?: number, status?: string, startDate?: string, endDate?: string) {
  const where: any = {
    type: { in: ['CONSUMPTION', 'LOSS', 'SUPPORT'] }
  }
  if (warehouseId) where.sourceId = warehouseId
  if (status) where.status = status

  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) where.createdAt.gte = new Date(startDate)
    if (endDate) where.createdAt.lte = new Date(endDate)
  }

  return prisma.transaction.findMany({
    where,
    include: {
      source: true,
      createdBy: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, name: true } },
      shift: true,
      institution: true,
      details: {
        include: { product: { include: { unit: true } } }
      }
    },
    orderBy: { createdAt: 'desc' }
  })
}

export async function getById(id: number) {
  const tx = await prisma.transaction.findUnique({
    where: { id },
    include: {
      details: {
        include: { product: { include: { unit: true } } }
      },
      destination: true,
      source: true,
      supplier: true,
      institution: true,
      createdBy: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, name: true } }
    }
  })
  if (!tx) throw new NotFoundError('Transacción', id.toString())
  return tx
}

export async function updateStatus(id: number, newStatus: TransactionStatus, user: UserContext, notes?: string) {
  const tx = await getById(id)

  // 1. Validar máquina de estado
  validateStateTransition(tx.status as TransactionStatus, newStatus, tx.type as TransactionType)

  // 2. Validar reglas de aprobación si pasa a APPROVED o REJECTED
  if (newStatus === 'APPROVED' || newStatus === 'REJECTED') {
    validateApproval(tx.status as TransactionStatus, tx.createdById, user)
  }

  // 3. Lógica Física Inyectada (Descontar en APPROVED, Sumar en CONFIRMED)
  if (newStatus === 'APPROVED') {
    if (tx.type === 'TRANSFER' || tx.type === 'SUPPORT') {
      await deductSourceStock(tx)
    }
  }

  if (newStatus === 'CONFIRMED') {
    if (tx.type === 'RECEPTION') {
      await addDestinationStock(tx)
    } else if (tx.type === 'TRANSFER' || tx.type === 'SUPPORT') {
      await addDestinationStock(tx)
    } else if (tx.type === 'CONSUMPTION' || tx.type === 'LOSS') {
      await deductSourceStock(tx) 
    }
  }

  // 4. Guardar en base de datos
  const dataToUpdate: any = { status: newStatus }
  if (newStatus === 'APPROVED' || newStatus === 'REJECTED') {
    dataToUpdate.approvedById = user.id
  }
  if (notes) {
    dataToUpdate.notes = tx.notes ? `${tx.notes}\n[${newStatus}]: ${notes}` : `[${newStatus}]: ${notes}`
  }

  const updatedTx = await prisma.transaction.update({
    where: { id },
    data: dataToUpdate,
    include: {
      details: { include: { product: { include: { unit: true } } } },
      destination: true,
      source: true,
      supplier: true,
      institution: true,
      createdBy: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, name: true } }
    }
  })
  
  emitEvent('transaction:sync', { action: 'update', transaction: updatedTx })
  return updatedTx
}

export async function deleteDraft(id: number, user: UserContext) {
  const tx = await getById(id)
  if (tx.status !== 'DRAFT' && tx.status !== 'PENDING') {
    throw new ValidationError('Solo se pueden eliminar transacciones en estado Borrador o Pendiente')
  }
  const deletedTx = await prisma.transaction.delete({ where: { id } })
  emitEvent('transaction:sync', { action: 'delete', transaction: tx })
  return deletedTx
}

export async function updateDraftDetails(id: number, newDetails: any[], user: UserContext) {
  const tx = await getById(id)
  
  if (tx.status !== 'DRAFT' && tx.status !== 'PENDING') {
    throw new ValidationError('Solo se pueden modificar transacciones en estado Borrador o Pendiente de Aprobación')
  }
  
  // Si está en PENDING, permitimos editar al ADMIN, GERENTE o al Creador original de la transacción
  if (tx.status === 'PENDING' && user.roleName !== 'ADMIN' && user.roleName !== 'GERENTE' && tx.createdById !== user.id) {
    throw new ValidationError('No tienes permisos para modificar esta transacción pendiente')
  }
  return prisma.$transaction(async (txPrisma) => {
    // 1. Eliminar detalles anteriores
    await txPrisma.transactionDetail.deleteMany({
      where: { transactionId: id }
    })
    
    // 2. Insertar los nuevos detalles actualizados
    const detailsToInsert = []
    if (newDetails && newDetails.length > 0) {
      for (const d of newDetails) {
        let productId = d.productId
        
        // OPCIÓN A: Crear producto al vuelo si es nuevo
        if (d.isNew && d.product) {
          const productCode = d.product.code || `TMP-${Date.now()}`
          
          // Verificar si el usuario tecleó un código que ya existe
          const existingProduct = await txPrisma.product.findUnique({ where: { code: productCode } })
          
          if (existingProduct) {
            // REQUERIMIENTO DEL USUARIO: Lanzar error en español y bloquear si repite código
            throw new ValidationError(`El código "${productCode}" ya pertenece a otro producto (${existingProduct.name}). Por favor, ingresa un código único para el nuevo producto.`)
          } else {
            // El producto no existe, lo creamos desde cero
            let category = await txPrisma.category.findFirst()
            if (!category) category = await txPrisma.category.create({ data: { name: 'Por Clasificar' } })
            
            let unitId = null
            if (d.product.unitText && d.product.unitText.trim().length > 0) {
              const abbr = d.product.unitText.trim().toUpperCase()
              let unit = await txPrisma.unit.findFirst({ where: { abbreviation: abbr } })
              if (!unit) {
                unit = await txPrisma.unit.create({ data: { name: abbr, abbreviation: abbr } })
              }
              unitId = unit.id
            } else {
              let defaultUnit = await txPrisma.unit.findFirst()
              if (!defaultUnit) defaultUnit = await txPrisma.unit.create({ data: { name: 'Unidad', abbreviation: 'UN' } })
              unitId = defaultUnit.id
            }
            
            const newProd = await txPrisma.product.create({
              data: {
                code: productCode,
                name: d.product.name || 'Producto Nuevo',
                categoryId: category.id,
                unitId: unitId,
                referencePrice: d.unitPrice || 0
              }
            })
            productId = newProd.id
          }
        }
        
        detailsToInsert.push({
          transactionId: id,
          productId: productId,
          quantity: d.quantity,
          expectedQuantity: d.expectedQuantity || d.quantity,
          discrepancyReason: null,
          unitPrice: d.unitPrice,
          expirationDate: d.expirationDate ? new Date(d.expirationDate) : null
        })
      }
      
      await txPrisma.transactionDetail.createMany({
        data: detailsToInsert
      })
    }
    
    // 3. Devolver la transacción fresca
    const updatedTx = await txPrisma.transaction.findUnique({
      where: { id },
      include: {
        details: { include: { product: { include: { unit: true } } } },
        destination: true,
        source: true,
        supplier: true,
        institution: true,
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } }
      }
    })
    
    if (updatedTx) emitEvent('transaction:sync', { action: 'update', transaction: updatedTx })
    return updatedTx
  })
}

import { emitEvent } from '../utils/eventBus'

/**
 * Función atómica para descontar stock del Almacén Origen.
 * Valida estrictamente que haya mercancía suficiente antes de descontar.
 */
async function deductSourceStock(tx: any) {
  if (!tx.sourceId) return;

  // FASE 1: VALIDACIÓN ATÓMICA
  const currentStocks = await prisma.stock.findMany({
    where: { warehouseId: tx.sourceId, productId: { in: tx.details.map((d: any) => d.productId) } }
  })
  const stockMap = new Map(currentStocks.map(s => [s.productId, s]))

  for (const detail of tx.details) {
    const current = stockMap.get(detail.productId)
    if (!current || Number(current.quantity) < Number(detail.quantity)) {
      throw new ValidationError(`Stock insuficiente para descontar. Tienes ${current ? current.quantity : 0} y la transacción exige ${detail.quantity}.`)
    }
  }

  // FASE 2: EJECUCIÓN SEGURA
  for (const detail of tx.details) {
    const current = stockMap.get(detail.productId)!
    const updatedSourceStock = await prisma.stock.update({
      where: { id: current.id },
      data: {
        quantity: { decrement: detail.quantity }
      }
    })

    // Alerta de stock mínimo
    const minStock = detail.product?.minimumStock ? Number(detail.product.minimumStock) : 0
    if (Number(updatedSourceStock.quantity) <= minStock) {
      emitEvent('stock:below-minimum', {
        warehouseId: tx.sourceId,
        productId: detail.productId,
        currentQuantity: Number(updatedSourceStock.quantity),
        minimumQuantity: minStock
      })
    }
    
    emitEvent('inventory:updated', {
      warehouseId: tx.sourceId,
      productId: detail.productId,
      quantity: Number(updatedSourceStock.quantity)
    })
  }
}

/**
 * Función atómica para sumar stock al Almacén Destino.
 */
async function addDestinationStock(tx: any) {
  if (!tx.destinationId) return;

  for (const detail of tx.details) {
    const updatedDestStock = await prisma.stock.upsert({
      where: {
        warehouseId_productId: {
          warehouseId: tx.destinationId,
          productId: detail.productId
        }
      },
      update: {
        quantity: { increment: detail.quantity }
      },
      create: {
        warehouseId: tx.destinationId,
        productId: detail.productId,
        quantity: detail.quantity
      }
    })
    
    emitEvent('inventory:updated', {
      warehouseId: tx.destinationId,
      productId: detail.productId,
      quantity: Number(updatedDestStock.quantity)
    })
    
    // Si es Recepción, actualizamos costo de referencia usando COSTO PROMEDIO PONDERADO
    if (tx.type === 'RECEPTION' && Number(detail.unitPrice) > 0) {
      // Usamos una Transacción Interactiva para evitar Race Conditions (Concurrency)
      await prisma.$transaction(async (txPrisma) => {
        // A. Obtener costo promedio actual
        const product = await txPrisma.product.findUnique({
          where: { id: detail.productId },
          select: { referencePrice: true }
        })
        const currentAverage = product ? Number(product.referencePrice) : 0
        
        // B. Obtener Stock Total actual de toda la empresa
        const allStocks = await txPrisma.stock.findMany({
          where: { productId: detail.productId }
        })
        const currentTotalStock = allStocks.reduce((sum, s) => sum + Number(s.quantity), 0)
        
        // El stock previo es el total menos la cantidad que acabamos de sumar arriba
        const previousStock = Math.max(0, currentTotalStock - Number(detail.quantity))
        
        const incomingQty = Number(detail.quantity)
        const incomingPrice = Number(detail.unitPrice)
        
        // C. Fórmula Matemática
        let newAverageCost = incomingPrice
        if (previousStock > 0) {
          newAverageCost = ((previousStock * currentAverage) + (incomingQty * incomingPrice)) / (previousStock + incomingQty)
        }
        
        // Seguro financiero de precisión y NaN
        if (!isFinite(newAverageCost) || isNaN(newAverageCost)) {
          newAverageCost = incomingPrice
        }
        newAverageCost = Math.round(newAverageCost * 100) / 100
        
        // D. Actualizar Catálogo Maestro
        await txPrisma.product.update({
          where: { id: detail.productId },
          data: { referencePrice: newAverageCost }
        })
      })
    }
  }
}
