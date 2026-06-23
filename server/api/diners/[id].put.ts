import { defineApiHandler } from '../../utils/handler'
import { requirePermission, requireUserContext } from '../../utils/auth'
import * as dinerRepo from '../../repository/dinerRepository'
import { prisma } from '../../utils/prisma'
import { ForbiddenError, ValidationError, NotFoundError } from '../../domain/errors'

export default defineApiHandler(async (event) => {
  // 1. Verificación dinámica de permisos
  await requirePermission(event, 'DINERS', 'update')
  const user = await requireUserContext(event)
  const dinerId = Number(event.context.params?.id)
  const body = await readBody(event)

  if (isNaN(dinerId)) {
    throw new ValidationError('ID de comensal inválido')
  }

  // 2. Obtener el comensal actual
  const currentDiner = await prisma.diner.findUnique({
    where: { id: dinerId }
  })

  if (!currentDiner || !currentDiner.active) {
    throw new NotFoundError('Comensal', String(dinerId))
  }

  // 3. Aislamiento Multi-Tenant (Seguridad)
  // Si no es global, solo puede editar comensales de su propia subdependencia
  if (!user.isGlobal && currentDiner.subdependencyId !== user.subdependencyId) {
    throw new ForbiddenError('No tienes permiso para editar un comensal de otra área.')
  }

  // 4. Validar duplicados de cédula si la están cambiando
  if (body.cedula && body.cedula !== currentDiner.cedula) {
    const existingDiner = await prisma.diner.findUnique({
      where: { cedula: body.cedula }
    })
    if (existingDiner) {
      throw new ValidationError('Ya existe un comensal registrado con esta cédula.')
    }
  }

  // 5. Actualizar
  return await dinerRepo.updateDiner(dinerId, {
    cedula: body.cedula,
    name: body.name,
    rationType: body.rationType,
    squadId: body.squadId ? Number(body.squadId) : undefined
  })
})
