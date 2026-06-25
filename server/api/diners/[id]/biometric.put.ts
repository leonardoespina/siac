import { defineApiHandler } from '../../../utils/handler'
import { requirePermission } from '../../../utils/auth'
import * as dinerRepo from '../../../repository/dinerRepository'

export default defineApiHandler(async (event) => {
  await requirePermission(event, 'DINERS', 'update')
  
  const id = Number(event.context.params?.id)
  if (!id) throw createError({ statusCode: 400, message: 'ID de comensal inválido' })

  const body = await readBody(event)
  if (!body.fingerprint) {
    throw createError({ statusCode: 400, message: 'Huella es requerida' })
  }

  const diner = await dinerRepo.updateDinerFingerprint(id, body.fingerprint)
  return diner
})
