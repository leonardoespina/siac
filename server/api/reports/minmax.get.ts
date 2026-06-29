import { defineApiHandler } from '../../utils/handler'
import { ReportsRepository } from '../../repository/ReportsRepository'

import { requirePermission } from '../../utils/auth'

const repository = new ReportsRepository()

export default defineApiHandler(async (event) => {
  await requirePermission(event, 'REPORT_MINMAX', 'read')
  const query = getQuery(event)
  const warehouseId = query.warehouseId ? parseInt(query.warehouseId as string) : undefined

  return await repository.getMinMaxStats(warehouseId)
})
