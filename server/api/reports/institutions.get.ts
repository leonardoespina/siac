import { defineApiHandler } from '../../utils/handler'
import { ReportsRepository } from '../../repository/ReportsRepository'

import { requirePermission, requireUserContext } from '../../utils/auth'

const repository = new ReportsRepository()

export default defineApiHandler(async (event) => {
  await requirePermission(event, 'REPORT_INSTITUTIONS', 'read')
  const user = await requireUserContext(event)
  
  const query = getQuery(event)
  const startDate = query.startDate ? new Date(query.startDate as string) : undefined
  const endDate = query.endDate ? new Date(query.endDate as string) : undefined
  
  // RLS: Si el usuario es local, forzar su almacén
  const targetWarehouseId = user.warehouseId ? user.warehouseId : undefined

  return await repository.getInstitutionsSupport(targetWarehouseId, startDate, endDate)
})
