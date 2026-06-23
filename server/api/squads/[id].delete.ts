import { defineApiHandler } from '../../utils/handler'
import { requirePermission, requireUserContext } from '../../utils/auth'
import * as dependencyRepo from '../../repository/dependencyRepository'
import { ForbiddenError, ValidationError } from '../../domain/errors'

export default defineApiHandler(async (event) => {
  await requirePermission(event, 'SQUADS', 'delete')
  const user = await requireUserContext(event)
  
  if (!user.isGlobal) {
    throw new ForbiddenError('Solo los administradores globales pueden eliminar cuadrillas del catálogo base.')
  }

  const id = Number(event.context.params?.id)
  if (!id) throw new ValidationError('ID inválido')

  return await dependencyRepo.deleteSquad(id)
})
