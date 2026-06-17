import { defineApiHandler } from '../../../utils/handler'
import { prisma } from '../../../utils/prisma'
import { requireUserContext } from '../../../utils/auth'
import { ValidationError } from '../../../domain/errors'

export default defineApiHandler(async (event) => {
  const user = await requireUserContext(event)
  const id = parseInt(event.context.params?.id as string)

  const shift = await prisma.shift.findUnique({ where: { id } })
  if (!shift) throw new ValidationError('Turno no encontrado')

  if (shift.status === 'CLOSED') {
    throw new ValidationError('Este turno ya fue cerrado')
  }

  // Solo el usuario que lo abrió, o un Admin, puede cerrarlo
  if (shift.userId !== user.id && user.roleName !== 'ADMIN' && user.roleName !== 'GERENTE') {
    throw new ValidationError('No tienes permiso para cerrar este turno')
  }

  // REGLA A: Bloqueo de Cierre si hay consumos pendientes
  const pendingTransactions = await prisma.transaction.count({
    where: { shiftId: id, status: 'PENDING' }
  })
  
  if (pendingTransactions > 0) {
    throw new ValidationError('No puedes cerrar el turno. Tienes consumos o mermas pendientes de aprobación por el Gerente.')
  }

  const body = await readBody(event).catch(() => ({}))
  const endTime = body?.endTime ? new Date(body.endTime) : new Date()

  const updated = await prisma.shift.update({
    where: { id },
    data: {
      status: 'CLOSED',
      endTime: endTime
    }
  })

  return updated
})
