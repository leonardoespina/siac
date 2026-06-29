import { prisma } from '../utils/prisma'
import { ValidationError } from '../domain/errors'
import { logAudit } from '../utils/audit'

export interface ExcelRow {
  productCode?: string
  productName: string
  categoryName: string
  unitName: string
  quantity: number
  unitPrice: number
  expirationDate?: string // ISO date
}

export async function importReceptionFromExcel(
  userId: number,
  destinationId: number,
  supplierId: number,
  referenceNumber: string,
  rows: ExcelRow[]
) {
  if (!destinationId || !supplierId || !referenceNumber || !rows || !Array.isArray(rows) || rows.length === 0) {
    throw new ValidationError('Debe proporcionar un almacén destino, un proveedor, un número de factura y al menos una fila de Excel.')
  }

  const createdTransaction = await prisma.$transaction(async (tx) => {
    // 1. Diccionarios en memoria para no hacer queries redundantes en el bucle
    const categoryCache = new Map<string, number>()
    const unitCache = new Map<string, number>()
    const productCache = new Map<string, number>()

    const detailsData = []

    // 2. Procesar fila por fila
    for (const [index, row] of rows.entries()) {
      if (!row.productName || !row.categoryName || !row.unitName || row.quantity <= 0) {
        throw new ValidationError(`Fila ${index + 1} inválida: Faltan datos clave o cantidad es 0.`)
      }

      const catName = row.categoryName.trim().toUpperCase()
      const unitName = row.unitName.trim().toUpperCase()
      const prodName = row.productName.trim()
      const prodCode = row.productCode?.trim() || `SKU-${Date.now()}-${index}`

      // Auto-upsert Categoría
      if (!categoryCache.has(catName)) {
        const cat = await tx.category.upsert({
          where: { name: catName },
          update: {},
          create: { name: catName }
        })
        categoryCache.set(catName, cat.id)
      }

      // Auto-upsert Unidad
      if (!unitCache.has(unitName)) {
        const unit = await tx.unit.upsert({
          where: { abbreviation: unitName },
          update: {},
          create: { name: unitName, abbreviation: unitName }
        })
        unitCache.set(unitName, unit.id)
      }

      // Auto-upsert Producto
      let productId = productCache.get(prodCode)
      if (!productId) {
        // Buscamos si existe por código
        let product = await tx.product.findUnique({ where: { code: prodCode } })
        
        if (!product) {
          // Buscamos si existe por nombre (por si no mandaron código pero el producto ya existía)
          const byName = await tx.product.findFirst({ where: { name: prodName } })
          if (byName) {
            product = byName
          } else {
            // No existe, lo creamos
            product = await tx.product.create({
              data: {
                code: prodCode,
                name: prodName,
                categoryId: categoryCache.get(catName)!,
                unitId: unitCache.get(unitName)!,
                isPerishable: !!row.expirationDate
              }
            })
          }
        }
        productId = product.id
        productCache.set(prodCode, productId)
      }

      // Preparamos la línea de la transacción
      detailsData.push({
        productId: productId,
        quantity: row.quantity,
        expectedQuantity: row.quantity, // Lo facturado/esperado según el Excel
        unitPrice: row.unitPrice || 0,
        expirationDate: row.expirationDate ? new Date(row.expirationDate) : null
      })
    }

    // 3. Crear la Transacción (Cabecera y Detalles) en estado BORRADOR
    const transaction = await tx.transaction.create({
      data: {
        type: 'RECEPTION',
        status: 'DRAFT',
        destinationId: Number(destinationId),
        supplierId: Number(supplierId),
        referenceNumber: String(referenceNumber).trim(),
        createdById: userId,
        notes: 'Importación masiva desde Excel',
        details: {
          create: detailsData
        }
      },
      include: {
        details: true
      }
    })

    return transaction
  }, {
    maxWait: 15000, // 15 segundos para adquirir conexión (Render free tier)
    timeout: 30000  // 30 segundos para ejecutar (Render free tier)
  })

  await logAudit(userId, 'CREATE', 'TRANSACTION', createdTransaction.id, `Importación Excel de ${rows.length} filas.`)

  return createdTransaction
}
