import { defineApiHandler } from '../../utils/handler'
import * as service from '../../services/transferService'
import { requireUserContext, requirePermission } from '../../utils/auth'

export default defineApiHandler(async (event) => {
  await requirePermission(event, 'TRANSFERS', 'create')
  const userContext = await requireUserContext(event)
  const body = await readBody(event)
  
  const transfer = await service.createTransfer(body, userContext)
  setResponseStatus(event, 201)
  return transfer
})
