import { defineApiHandler } from '../../../utils/handler'
import * as service from '../../../services/transferService'
import { requireAuth, requirePermission } from '../../../utils/auth'
import type { TransactionStatus } from '../../../domain/transaction'
import { prisma } from '../../../utils/prisma'
import { ValidationError } from '../../../domain/errors'

export default defineApiHandler(async (event) => {
  const userId = await requireAuth(event)
  const id = parseInt(event.context.params?.id || '0')
  const body = await readBody(event)
  
  if (!body.status) {
    throw new ValidationError('Estado requerido')
  }

  // Necesitamos saber el tipo de transacción, almacenes involucrados y su tipo
  const tx = await prisma.transaction.findUnique({ 
    where: { id }, 
    select: { type: true, sourceId: true, destinationId: true, source: { select: { type: true } } } 
  })
  if (!tx) throw new ValidationError('Transacción no encontrada')

  if (body.status === 'APPROVED' || body.status === 'REJECTED') {
    // Si es una transferencia Local a Local, el almacén de Origen (LOCAL) puede auto-aprobar su salida
    const user = await prisma.user.findUnique({ where: { id: userId } })
    
    if (tx.type === 'TRANSFER' && tx.source?.type === 'LOCAL' && user?.warehouseId === tx.sourceId) {
      try {
        await requirePermission(event, 'OPERATIONS', 'update')
      } catch (e) {
        await requirePermission(event, 'TRANSFERS', 'update')
      }
    } else {
      // Regla general: Si viene de Central, o cualquier otra cosa, exige Aprobación Gerencial
      await requirePermission(event, 'APPROVAL_TRANSFERS', 'update')
    }
  } else {
    // Si es un consumo local o merma, la acción 'Aprobar Consumo' la hace el operador local.
    // Por tanto, requerimos el permiso de OPERATIONS o TRANSFERS.
    if (tx.type === 'CONSUMPTION' || tx.type === 'LOSS') {
      try {
        await requirePermission(event, 'OPERATIONS', 'update')
      } catch (e) {
        // Fallback: si no tiene OPERATIONS, probamos con TRANSFERS por si es un rol legado
        await requirePermission(event, 'TRANSFERS', 'update')
      }
    } else {
      // Para Transferencias entre almacenes (TRANSFER) y Recepciones (RECEPTION), pedimos TRANSFERS
      await requirePermission(event, 'TRANSFERS', 'update')
    }
  }

  const userRecord = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true }
  })
  const userContext = { id: userRecord!.id, roleName: userRecord!.role.name }

  return await service.changeTransferStatus(id, body.status as TransactionStatus, userContext, body.notes)
})
