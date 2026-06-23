import { defineApiHandler } from '../../utils/handler'
import { requirePermission } from '../../utils/auth'
import * as dinerService from '../../services/dinerService'
import { ForbiddenError, ValidationError } from '../../domain/errors'

export default defineApiHandler(async (event) => {
  // 1. Verificación dinámica de permisos
  const auth = await requirePermission(event, 'DINERS_REQUESTS', 'create')
  const body = await readBody(event)

  if (!body.targetDate || !body.shiftType || !Array.isArray(body.dinersList)) {
    throw new ValidationError('Faltan parámetros: targetDate, shiftType o dinersList.')
  }

  // 2. Aislamiento Multi-Tenant
  // Si no es un administrador global, debe pertenecer a una subdependencia para poder pedir comida
  if (!auth.user.role.isGlobal && !auth.user.subdependencyId) {
    throw new ForbiddenError('Tu usuario no está asignado a ninguna subdependencia. No puedes solicitar comida.')
  }

  // (Podríamos agregar aquí una validación extra para comprobar que todos los diners en dinersList 
  // pertenecen a la subdependencia de auth.user.subdependencyId, pero por simplicidad de este paso, lo dejamos al servicio)

  // 3. Delegar al Servicio (Orquestador)
  return await dinerService.submitDinerRequest(
    new Date(body.targetDate),
    body.shiftType,
    auth.user.id,
    body.dinersList
  )
})
