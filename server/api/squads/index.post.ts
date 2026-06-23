import { defineApiHandler } from '../../utils/handler'
import { requirePermission, requireUserContext } from '../../utils/auth'
import * as dependencyRepo from '../../repository/dependencyRepository'
import { ForbiddenError, ValidationError } from '../../domain/errors'

export default defineApiHandler(async (event) => {
  // 1. Verificación dinámica de permisos (Sin roles hardcodeados)
  await requirePermission(event, 'SQUADS', 'create')
  const user = await requireUserContext(event)
  const body = await readBody(event)

  // Solo los administradores globales (RRHH principal) deberían poder crear catálogos globales de cuadrillas
  if (!user.isGlobal) {
    throw new ForbiddenError('Solo los administradores globales pueden crear cuadrillas en el catálogo base.')
  }

  if (!body.name) {
    throw new ValidationError('El nombre de la cuadrilla es obligatorio.')
  }

  // 3. Crear la cuadrilla global
  return await dependencyRepo.createSquad(body.name)
})
