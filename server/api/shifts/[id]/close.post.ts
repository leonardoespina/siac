import { defineApiHandler } from '../../../utils/handler'
import { prisma } from '../../../utils/prisma'
import { requireUserContext } from '../../../utils/auth'
import { ValidationError } from '../../../domain/errors'
import { emitEvent } from '../../../utils/eventBus'

export default defineApiHandler(async (event) => {
  const user = await requireUserContext(event)
  const id = parseInt(event.context.params?.id as string)

  const shift = await prisma.shift.findUnique({ where: { id } })
  if (!shift) throw new ValidationError('Turno no encontrado')

  if (shift.status === 'CLOSED') {
    throw new ValidationError('Este turno ya fue cerrado')
  }

  // Solo el usuario que lo abrió, o un Admin/Gerente, puede cerrarlo
  const role = user.roleName.toUpperCase()
  const isGlobalUser = role === 'ADMIN' || role === 'ADMINISTRADOR' || role === 'GERENTE'
  
  if (shift.userId !== user.id && !isGlobalUser) {
    throw new ValidationError('No tienes permiso para cerrar este turno')
  }

  // REGLA 1: Bloqueo de Cierre si hay recepciones/transferencias entrantes pendientes en puerta
  const pendingIncoming = await prisma.transaction.count({
    where: {
      destinationId: shift.warehouseId,
      type: 'TRANSFER',
      status: 'APPROVED'
    }
  })

  if (pendingIncoming > 0) {
    throw new ValidationError(`No puedes cerrar el turno. Tienes ${pendingIncoming} recepción(es) de mercancía pendiente(s) por recibir en puerta ('Recibir Mercancía'). Por favor confirma la recepción antes de cerrar.`)
  }

  // REGLA 2: Bloqueo de Cierre si hay borradores sin finalizar en el turno
  const draftTransactions = await prisma.transaction.count({
    where: { shiftId: id, status: 'DRAFT' }
  })

  if (draftTransactions > 0) {
    throw new ValidationError(`Tienes ${draftTransactions} borrador(es) de consumo sin guardar o enviar. Por favor completa o elimina los borradores antes de cerrar el turno.`)
  }

  // REGLA 3: Bloqueo de Cierre si hay consumos o mermas pendientes de aprobación
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
    },
    include: {
      warehouse: true,
      user: { select: { id: true, name: true } }
    }
  })

  emitEvent('shift:sync', { action: 'update', shift: updated })

  return updated
})
