import { defineApiHandler } from '../../utils/handler'
import { ReportsRepository } from '../../repository/ReportsRepository'

import { requirePermission, requireUserContext } from '../../utils/auth'

const repository = new ReportsRepository()

export default defineApiHandler(async (event) => {
  await requirePermission(event, 'REPORT_VALUE', 'read')
  const user = await requireUserContext(event)
  
  const query = getQuery(event)
  let warehouseId = query.warehouseId ? parseInt(query.warehouseId as string) : undefined
  
  // RLS: Si el usuario es local, forzar su almacén
  if (user.warehouseId) warehouseId = user.warehouseId
  
  const categoryId = query.categoryId ? parseInt(query.categoryId as string) : undefined

  return await repository.getInventoryValue(warehouseId, categoryId)
})
