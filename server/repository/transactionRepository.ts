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

  return prisma.transaction.create({
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
          unitPrice: d.unitPrice || 0
        }))
      }
    },
    include: { details: true }
  })
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
  validateStateTransition(tx.status as TransactionStatus, newStatus)

  // 2. Validar reglas de aprobación si pasa a APPROVED o REJECTED
  if (newStatus === 'APPROVED' || newStatus === 'REJECTED') {
    validateApproval(tx.status as TransactionStatus, tx.createdById, user)
  }

  // 3. Si pasa a CONFIRMED, afectar el stock matemáticamente
  if (newStatus === 'CONFIRMED') {
    await applyStockChanges(tx)
  }

  // 4. Guardar en base de datos
  const dataToUpdate: any = { status: newStatus }
  if (newStatus === 'APPROVED' || newStatus === 'REJECTED') {
    dataToUpdate.approvedById = user.id
  }
  if (notes) {
    dataToUpdate.notes = tx.notes ? `${tx.notes}\n[${newStatus}]: ${notes}` : `[${newStatus}]: ${notes}`
  }

  return prisma.transaction.update({
    where: { id },
    data: dataToUpdate
  })
}

export async function deleteDraft(id: number, user: UserContext) {
  const tx = await getById(id)
  if (tx.status !== 'DRAFT' && tx.status !== 'PENDING') {
    throw new ValidationError('Solo se pueden eliminar transacciones en estado Borrador o Pendiente')
  }
  return prisma.transaction.delete({ where: { id } })
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
    if (newDetails && newDetails.length > 0) {
      await txPrisma.transactionDetail.createMany({
        data: newDetails.map(d => ({
          transactionId: id,
          productId: d.productId,
          quantity: d.quantity,
          expectedQuantity: d.expectedQuantity,
          discrepancyReason: d.discrepancyReason || null,
          unitPrice: d.unitPrice,
          expirationDate: d.expirationDate ? new Date(d.expirationDate) : null
        }))
      })
    }
    
    // 3. Devolver la transacción fresca
    return txPrisma.transaction.findUnique({
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
  })
}

import { emitEvent } from '../utils/eventBus'

/**
 * Función interna que inyecta los cambios al inventario físico y emite alertas de stock.
 */
async function applyStockChanges(tx: any) {
  if (tx.type === 'RECEPTION' && tx.destinationId) {
    for (const detail of tx.details) {
      const updatedStock = await prisma.stock.upsert({
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
      
      // Emitir el evento de actualización de inventario para sockets en tiempo real
      emitEvent('inventory:updated', {
        warehouseId: tx.destinationId,
        productId: detail.productId,
        quantity: Number(updatedStock.quantity)
      })
      
      // [NUEVO] Capturar y guardar el precio de la factura como "Costo Ref" del Producto
      if (Number(detail.unitPrice) > 0) {
        await prisma.product.update({
          where: { id: detail.productId },
          data: { referencePrice: detail.unitPrice }
        })
      }
    }
  }

  if (tx.type === 'TRANSFER' && tx.sourceId && tx.destinationId) {
    for (const detail of tx.details) {
      // 1. Restar del Almacén Origen (Central) - Usamos upsert para evitar crash si no existía el registro
      const updatedSourceStock = await prisma.stock.upsert({
        where: {
          warehouseId_productId: {
            warehouseId: tx.sourceId,
            productId: detail.productId
          }
        },
        update: {
          quantity: { decrement: detail.quantity }
        },
        create: {
          warehouseId: tx.sourceId,
          productId: detail.productId,
          quantity: -detail.quantity
        }
      })
      
      emitEvent('inventory:updated', {
        warehouseId: tx.sourceId,
        productId: detail.productId,
        quantity: Number(updatedSourceStock.quantity)
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

      // 2. Sumar al Almacén Destino (Local/Cocina)
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
    }
  }

  if ((tx.type === 'CONSUMPTION' || tx.type === 'LOSS' || tx.type === 'SUPPORT') && tx.sourceId) {
    // FASE 1: VALIDACIÓN ATÓMICA
    const currentStocks = await prisma.stock.findMany({
      where: { warehouseId: tx.sourceId, productId: { in: tx.details.map((d: any) => d.productId) } }
    })
    const stockMap = new Map(currentStocks.map(s => [s.productId, s]))

    for (const detail of tx.details) {
      const current = stockMap.get(detail.productId)
      if (!current || Number(current.quantity) < Number(detail.quantity)) {
        throw new ValidationError(`Stock insuficiente para descontar ${detail.quantity} del producto ID ${detail.productId}`)
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
}
