import { defineApiHandler } from '../../utils/handler'
import { requirePermission, requireUserContext } from '../../utils/auth'
import * as dinerService from '../../services/dinerService'
import { ForbiddenError, ValidationError } from '../../domain/errors'

export default defineApiHandler(async (event) => {
  // 1. Verificación dinámica de permisos
  await requirePermission(event, 'DINERS_REQUESTS', 'create')
  const userContext = await requireUserContext(event)
  const body = await readBody(event)

  if (!body.targetDate || !body.shiftType || !Array.isArray(body.dinersList)) {
    throw new ValidationError('Faltan parámetros: targetDate, shiftType o dinersList.')
  }

  // 2. Aislamiento Multi-Tenant
  // Si no es un administrador global, debe pertenecer a una subdependencia para poder pedir comida
  if (!userContext.isGlobal && !userContext.subdependencyId) {
    throw new ForbiddenError('Tu usuario no está asignado a ninguna subdependencia. No puedes solicitar comida.')
  }

  // 3. Delegar al Servicio (Orquestador)
  return await dinerService.submitDinerRequest(
    new Date(body.targetDate),
    body.shiftType,
    userContext.id,
    body.dinersList
  )
})
