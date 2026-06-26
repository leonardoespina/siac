import { defineApiHandler } from '../../../utils/handler'
import { requirePermission } from '../../../utils/auth'
import * as dinerRepo from '../../../repository/dinerRepository'
import { ValidationError } from '../../../domain/errors'

export default defineApiHandler(async (event) => {
  await requirePermission(event, 'DINERS', 'update')
  
  const id = Number(event.context.params?.id)
  if (!id) throw new ValidationError(['ID de comensal inválido'])

  const body = await readBody(event)
  if (!body.fingerprint) {
    throw new ValidationError(['Huella es requerida'])
  }

  const diner = await dinerRepo.updateDinerFingerprint(id, body.fingerprint)
  return diner
})
