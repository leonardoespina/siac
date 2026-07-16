import { defineApiHandler } from '../../../utils/handler'
import * as repo from '../../../repository/transactionRepository'
import { requireAuth } from '../../../utils/auth'

import { prisma } from '../../../utils/prisma'

export default defineApiHandler(async (event) => {
  await requireAuth(event)
  const id = parseInt(event.context.params?.id || '0')
  const tx = await repo.getById(id)

  if (tx && (tx.status === 'DRAFT' || tx.status === 'PENDING')) {
    const productIds = tx.details.map((d: any) => d.productId)
    
    if (productIds.length > 0) {
      const stocks = await prisma.stock.groupBy({
        by: ['productId'],
        _sum: { quantity: true },
        where: { productId: { in: productIds } }
      })
      
      const stockMap = new Map(stocks.map(s => [s.productId, Number(s._sum.quantity || 0)]))
      
      for (const d of tx.details) {
        if (d.product) {
          (d.product as any).totalStock = stockMap.get(d.productId) || 0
        }
      }
    }
  }

  return tx
})
