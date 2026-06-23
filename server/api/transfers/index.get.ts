import { defineApiHandler } from '../../utils/handler'
import * as service from '../../services/transferService'
import { requireUserContext, hasGlobalAccess } from '../../utils/auth'

export default defineApiHandler(async (event) => {
  const user = await requireUserContext(event)
  const targetWarehouseId = hasGlobalAccess(user) ? undefined : user.warehouseId
  return await service.listTransfers(targetWarehouseId || undefined)
})
