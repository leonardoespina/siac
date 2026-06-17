import { defineApiHandler } from '../../utils/handler'
import * as service from '../../services/transferService'
import { requireAuth } from '../../utils/auth'

export default defineApiHandler(async (event) => {
  await requireAuth(event)
  return await service.listTransfers()
})
