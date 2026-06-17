import { defineApiHandler } from '../../utils/handler'
import { prisma } from '../../utils/prisma'
import { requireUserContext } from '../../utils/auth'

export default defineApiHandler(async (event) => {
  const user = await requireUserContext(event)
  const query = getQuery(event)
  
  // Si el usuario es global (no tiene warehouse fijo), leemos el que envía por URL
  const targetWarehouseId = user.warehouseId || Number(query.warehouseId)

  if (!targetWarehouseId) return null

  const shift = await prisma.shift.findFirst({
    where: {
      warehouseId: targetWarehouseId,
      status: 'OPEN'
    },
    include: {
      warehouse: true
    }
  })

  return shift || null
})
