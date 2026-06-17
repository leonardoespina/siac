import { defineApiHandler } from '../../utils/handler'
import * as service from '../../services/transferService'
import { requireAuth } from '../../utils/auth'

export default defineApiHandler(async (event) => {
  const userId = await requireAuth(event)
  const body = await readBody(event)
  
  const userContext = { id: userId }
  const transfer = await service.createTransfer(body, userContext as any)
  setResponseStatus(event, 201)
  return transfer
})
