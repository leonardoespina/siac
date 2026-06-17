import { prisma } from '../utils/prisma'
import type { UserContext } from '../domain/transaction'

export async function listTransfers() {
  return prisma.transaction.findMany({
    where: { type: 'TRANSFER' },
    include: {
      source: true,
      destination: true,
      createdBy: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, name: true } }
    },
    orderBy: { createdAt: 'desc' }
  })
}

export async function createTransferDraft(
  sourceId: number, 
  destinationId: number, 
  details: any[], 
  user: UserContext
) {
  // Buscar los precios referenciales de los productos para asegurarnos de que la transferencia lleve valor
  const productIds = details.map(d => d.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, referencePrice: true }
  });
  
  const productMap = new Map(products.map(p => [p.id, Number(p.referencePrice)]));

  return prisma.transaction.create({
    data: {
      type: 'TRANSFER',
      status: 'DRAFT',
      sourceId,
      destinationId,
      createdById: user.id,
      details: {
        create: details.map(d => ({
          productId: d.productId,
          quantity: d.quantity,
          unitPrice: Number(d.unitPrice) > 0 ? Number(d.unitPrice) : (productMap.get(d.productId) || 0)
        }))
      }
    },
    include: {
      details: { include: { product: { include: { unit: true } } } },
      source: true,
      destination: true
    }
  })
}
