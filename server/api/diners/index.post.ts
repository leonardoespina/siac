import { defineApiHandler } from '../../utils/handler'
import { requirePermission, requireUserContext } from '../../utils/auth'
import * as dinerRepo from '../../repository/dinerRepository'
import { prisma } from '../../utils/prisma'
import { ForbiddenError, ValidationError } from '../../domain/errors'

export default defineApiHandler(async (event) => {
  // 1. Verificación dinámica de permisos
  await requirePermission(event, 'DINERS', 'create')
  const user = await requireUserContext(event)
  const body = await readBody(event)

  const squadId = Number(body.squadId)

  if (!squadId || !body.cedula || !body.name) {
    throw new ValidationError('Cédula, nombre y cuadrilla son obligatorios.')
  }
  // 2. Aislamiento Multi-Tenant (Seguridad)
  let targetSubdependencyId = user.subdependencyId
  if (user.isGlobal && body.subdependencyId) {
    targetSubdependencyId = Number(body.subdependencyId)
  }

  if (!targetSubdependencyId) {
    throw new ForbiddenError('Tu usuario no está asignado a ninguna subdependencia. No puedes agregar comensales.')
  }

  // 3. Validar duplicados por cédula
  const existingDiner = await prisma.diner.findUnique({
    where: { cedula: body.cedula }
  })

  if (existingDiner) {
    throw new ValidationError('Ya existe un comensal registrado con esta cédula.')
  }

  return await dinerRepo.createDiner({
    cedula: body.cedula,
    name: body.name,
    rationType: body.rationType,
    squadId: Number(body.squadId),
    subdependencyId: targetSubdependencyId
  })
})
