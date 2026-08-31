import { defineApiHandler } from '../../utils/handler'
import { ReportsRepository } from '../../repository/ReportsRepository'
import { requirePermission, requireUserContext } from '../../utils/auth'
import { parseDateRange } from '../../utils/dates'

const repository = new ReportsRepository()

export default defineApiHandler(async (event) => {
  await requirePermission(event, 'REPORT_INSTITUTIONS', 'read')
  const user = await requireUserContext(event)
  
  const query = getQuery(event)
  const { startDate, endDate } = parseDateRange(query.startDate as string, query.endDate as string)
  let warehouseId = query.warehouseId ? parseInt(query.warehouseId as string) : undefined
  
  // RLS: Si el usuario es local, forzar su almacén
  if (user.warehouseId) warehouseId = user.warehouseId

  return await repository.getInstitutionsSupport(warehouseId, startDate, endDate)
})
