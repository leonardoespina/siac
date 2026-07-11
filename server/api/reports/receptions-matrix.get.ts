import { defineApiHandler } from '../../utils/handler'
import { prisma } from '../../utils/prisma'
import { z } from 'zod'
import { useValidatedQuery } from 'h3-zod'

const querySchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  categoryId: z.string().optional(),
  warehouseId: z.string().optional()
})

export default defineApiHandler(async (event) => {
  const query = await useValidatedQuery(event, querySchema)
  
  const start = new Date(query.startDate)
  const end = new Date(query.endDate)
  end.setHours(23, 59, 59, 999)

  const transactions = await prisma.transaction.findMany({
    where: {
      type: 'RECEPTION',
      status: 'CONFIRMED',
      createdAt: { gte: start, lte: end },
      ...(query.warehouseId ? { destinationId: parseInt(query.warehouseId) } : {})
    },
    include: {
      details: { include: { product: { include: { unit: true, category: true } } } }
    },
    orderBy: { createdAt: 'asc' }
  })

  const productsMap = new Map<number, any>()
  const dispatches: any[] = []

  transactions.forEach((tx) => {
    const txLabel = `${tx.createdAt.toLocaleDateString('es-ES')} - REC-${tx.id}`
    dispatches.push({ id: tx.id, label: txLabel })

    tx.details.forEach(det => {
      if (query.categoryId && det.product.categoryId !== parseInt(query.categoryId)) return

      if (!productsMap.has(det.productId)) {
        productsMap.set(det.productId, {
          id: det.productId,
          code: det.product.code,
          name: det.product.name,
          unit: det.product.unit.abbreviation,
          quantities: {},
          total: 0
        })
      }
      
      const productRow = productsMap.get(det.productId)
      const qty = Number(det.quantity)
      productRow.quantities[tx.id] = (productRow.quantities[tx.id] || 0) + qty
      productRow.total += qty
    })
  })

  return {
    dispatches,
    rows: Array.from(productsMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  }
})
