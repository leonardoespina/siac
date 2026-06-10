import { defineApiHandler } from '../../utils/handler'
import * as repo from '../../repository/transactionRepository'
import { requireAuth } from '../../utils/auth'

export default defineApiHandler(async (event) => {
  await requireAuth(event)
  return await repo.listReceptions()
})
