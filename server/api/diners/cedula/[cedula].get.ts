import { defineApiHandler } from '../../../utils/handler'
import { requirePermission } from '../../../utils/auth'
import * as dinerRepo from '../../../repository/dinerRepository'

export default defineApiHandler(async (event) => {
  await requirePermission(event, 'DINERS', 'read')
  
  const cedula = event.context.params?.cedula
  if (!cedula) throw createError({ statusCode: 400, message: 'Cédula es requerida' })

  const diner = await dinerRepo.getDinerByCedula(cedula as string)
  
  if (!diner) {
    throw createError({ statusCode: 404, message: 'Comensal no encontrado' })
  }

  return diner
})
