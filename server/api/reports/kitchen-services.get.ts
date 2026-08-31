import { defineApiHandler } from '../../utils/handler'
import { requirePermission, requireUserContext } from '../../utils/auth'
import { getKitchenServicesReport } from '../../services/kitchenReportService'
import { parseDateRange } from '../../utils/dates'
import type { ServiceType } from '../../domain/kitchenServices'

export default defineApiHandler(async (event) => {
  try {
    await requirePermission(event, 'REPORT_SERVICES', 'read')
  } catch {
    await requirePermission(event, 'REPORT_CONSUMPTIONS', 'read')
  }
  const user = await requireUserContext(event)

  const query = getQuery(event)
  let warehouseId = query.warehouseId ? parseInt(query.warehouseId as string) : undefined

  // RLS: Si el usuario es local y no global, restringir forzosamente a su comedor asignado
  if (user.warehouseId) {
    warehouseId = user.warehouseId
  }

  const { startDate, endDate } = parseDateRange(query.startDate as string, query.endDate as string)
  const serviceType = (query.serviceType as ServiceType) || undefined

  return await getKitchenServicesReport({
    warehouseId,
    startDate,
    endDate,
    serviceType
  })
})
