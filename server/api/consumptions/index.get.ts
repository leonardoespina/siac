import { defineApiHandler } from '../../utils/handler'
import * as repo from '../../repository/transactionRepository'
import { requireAuth } from '../../utils/auth'

export default defineApiHandler(async (event) => {
  await requireAuth(event)
  const query = getQuery(event)
  const warehouseId = query.warehouseId ? Number(query.warehouseId) : undefined
  const status = query.status ? String(query.status) : undefined
  
  return await repo.listConsumptions(warehouseId, status)
})
