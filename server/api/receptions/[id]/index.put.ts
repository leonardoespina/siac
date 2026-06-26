import { defineApiHandler } from '../../../utils/handler'
import * as repo from '../../../repository/transactionRepository'
import { requireUserContext } from '../../../utils/auth'

export default defineApiHandler(async (event) => {
  const user = await requireUserContext(event)
  const id = parseInt(event.context.params?.id || '0')
  const body = await readBody(event)
  
  if (!body.details || !Array.isArray(body.details)) {
    throw new Error('Faltan los detalles a actualizar')
  }

  return await repo.updateDraftDetails(id, body.details, user)
})
