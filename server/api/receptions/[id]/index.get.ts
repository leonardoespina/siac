import { defineApiHandler } from '../../../utils/handler'
import * as repo from '../../../repository/transactionRepository'
import { requireAuth } from '../../../utils/auth'

export default defineApiHandler(async (event) => {
  await requireAuth(event)
  const id = parseInt(event.context.params?.id || '0')
  return await repo.getById(id)
})
