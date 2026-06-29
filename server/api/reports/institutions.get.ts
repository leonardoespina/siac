import { defineApiHandler } from '../../utils/handler'
import { ReportsRepository } from '../../repository/ReportsRepository'

import { requirePermission } from '../../utils/auth'

const repository = new ReportsRepository()

export default defineApiHandler(async (event) => {
  await requirePermission(event, 'REPORT_INSTITUTIONS', 'read')
  const query = getQuery(event)
  const startDate = query.startDate ? new Date(query.startDate as string) : undefined
  const endDate = query.endDate ? new Date(query.endDate as string) : undefined
  
  // Frontend now sends exact ISO string boundaries

  return await repository.getInstitutionsSupport(startDate, endDate)
})
