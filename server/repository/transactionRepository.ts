import { prisma } from '../utils/prisma'
import { NotFoundError, ValidationError } from '../domain/errors'
import { validateStateTransition, validateApproval, type TransactionStatus, type UserContext } from '../domain/transaction'

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

export async function getById(id: number) {
  const tx = await prisma.transaction.findUnique({
    where: { id },
    include: {
      details: {
        include: { product: { include: { unit: true } } }
      },
      destination: true,
      source: true,
      supplier: true
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
  if (tx.status !== 'DRAFT') {
    throw new ValidationError('Solo se pueden eliminar recepciones en estado Borrador')
  }
  return prisma.transaction.delete({ where: { id } })
}

export async function updateDraftDetails(id: number, newDetails: any[], user: UserContext) {
  const tx = await getById(id)
  if (tx.status !== 'DRAFT') {
    throw new ValidationError('Solo se pueden modificar recepciones en estado Borrador')
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
        supplier: true
      }
    })
  })
}

/**
 * Función interna que inyecta los cambios al inventario físico.
 */
async function applyStockChanges(tx: any) {
  if (tx.type === 'RECEPTION' && tx.destinationId) {
    for (const detail of tx.details) {
      await prisma.stock.upsert({
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
    }
  }
  // Lógica para TRANSFER se agregará en siguientes iteraciones
}
