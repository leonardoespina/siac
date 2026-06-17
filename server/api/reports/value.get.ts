import { defineApiHandler } from '../../utils/handler'
import { ReportsRepository } from '../../repository/ReportsRepository'

const repository = new ReportsRepository()

export default defineApiHandler(async (event) => {
  const query = getQuery(event)
  const warehouseId = query.warehouseId ? parseInt(query.warehouseId as string) : undefined
  const categoryId = query.categoryId ? parseInt(query.categoryId as string) : undefined

  return await repository.getInventoryValue(warehouseId, categoryId)
})
