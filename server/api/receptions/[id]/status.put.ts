import { defineApiHandler } from '../../../utils/handler'
import * as repo from '../../../repository/transactionRepository'
import { requireAuth, requirePermission } from '../../../utils/auth'
import { ValidationError } from '../../../domain/errors'
import { logAudit } from '../../../utils/audit'
import { prisma } from '../../../utils/prisma'
import type { TransactionStatus } from '../../../domain/transaction'

export default defineApiHandler(async (event) => {
  // Inicialmente solo validamos auth genérico para leer el body
  const userId = await requireAuth(event)
  
  const id = parseInt(event.context.params?.id || '0')
  if (!id) throw new ValidationError('ID inválido')

  const body = await readBody(event)
  const newStatus = body.status as TransactionStatus
  const notes = body.notes

  if (!newStatus) throw new ValidationError('El nuevo estado (status) es requerido')

  // Validación granular de la Matriz de Permisos según el estado objetivo
  if (newStatus === 'APPROVED' || newStatus === 'REJECTED') {
    await requirePermission(event, 'APPROVAL_RECEPTIONS', 'update')
  } else {
    await requirePermission(event, 'RECEPTIONS', 'update')
  }

  // Obtener rol del usuario para validaciones de negocio
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true }
  })
  
  const userContext = { id: user!.id, roleName: user!.role.name }

  const updatedTx = await repo.updateStatus(id, newStatus, userContext, notes)

  await logAudit(userId, 'UPDATE_STATUS', 'TRANSACTION', id, `Recepción cambió a estado: ${newStatus}`)

  // TODO: Emitir evento Socket si pasa a PENDING o APPROVED/REJECTED

  return updatedTx
})
