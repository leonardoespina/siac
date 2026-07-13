import { defineApiHandler } from '../../../utils/handler'
import * as repo from '../../../repository/transactionRepository'
import { requireUserContext, hasGlobalAccess } from '../../../utils/auth'
import { ForbiddenError } from '../../../domain/errors'

export default defineApiHandler(async (event) => {
  const user = await requireUserContext(event)
  const id = parseInt(event.context.params?.id || '0')
  
  const tx = await repo.getById(id)

  // Aislamiento de Visibilidad
  if (!hasGlobalAccess(user) && user.warehouseId) {
    if (tx.sourceId !== user.warehouseId && tx.destinationId !== user.warehouseId) {
      throw new ForbiddenError('No tienes permisos para ver las transferencias de otros locales.')
    }
  }

  return tx
})
