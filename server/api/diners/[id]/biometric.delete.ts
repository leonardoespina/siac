import { defineApiHandler } from '../../../utils/handler'
import { requirePermission } from '../../../utils/auth'
import * as dinerRepo from '../../../repository/dinerRepository'

export default defineApiHandler(async (event) => {
  // Para borrar huellas se necesita permiso de actualización en el módulo de comensales o de seguridad
  await requirePermission(event, 'DINERS', 'update')
  
  const id = Number(event.context.params?.id)
  if (!id) throw createError({ statusCode: 400, message: 'ID de comensal inválido' })

  const diner = await dinerRepo.clearDinerFingerprint(id)
  return diner
})
