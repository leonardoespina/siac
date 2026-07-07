import { defineApiHandler } from '../../utils/handler'
import * as repo from '../../repository/transactionRepository'
import { requireUserContext, hasGlobalAccess } from '../../utils/auth'

export default defineApiHandler(async (event) => {
  const user = await requireUserContext(event)
  const query = getQuery(event)
  
  const requestedWarehouseId = query.warehouseId ? Number(query.warehouseId) : undefined
  const targetWarehouseId = hasGlobalAccess(user) ? requestedWarehouseId : (user.warehouseId || undefined)
  const status = query.status ? String(query.status) : undefined
  const startDate = query.startDate ? String(query.startDate) : undefined
  const endDate = query.endDate ? String(query.endDate) : undefined
  
  return await repo.listConsumptions(targetWarehouseId, status, startDate, endDate)
})
