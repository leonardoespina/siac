import { defineApiHandler } from '../../utils/handler'
import { prisma } from '../../utils/prisma'

export default defineApiHandler(async (event) => {
  const query = getQuery(event)
  const warehouseId = query.warehouseId ? parseInt(query.warehouseId as string) : undefined
  const dateStr = query.date as string

  // Filtros dinámicos
  const whereClause: any = {}
  
  if (warehouseId) {
    whereClause.warehouseId = warehouseId
  }

  if (dateStr) {
    // Buscar todos los turnos que hayan empezado o terminado en esa fecha
    // Buscar todos los turnos que hayan empezado o terminado en esa fecha
    // Solución al problema de Zona Horaria (UTC vs Local)
    const [year, month, day] = dateStr.split('-').map(Number)
    const startDate = new Date(year, month - 1, day, 0, 0, 0, 0)
    const endDate = new Date(year, month - 1, day, 23, 59, 59, 999)

    whereClause.startTime = {
      gte: startDate,
      lte: endDate
    }
  }

  const shifts = await prisma.shift.findMany({
    where: whereClause,
    include: {
      warehouse: true,
      user: { select: { name: true } },
      transactions: {
        where: { type: { in: ['CONSUMPTION', 'LOSS', 'SUPPORT'] } },
        include: {
          institution: true,
          details: {
            include: { product: { include: { unit: true } } }
          }
        }
      }
    },
    orderBy: { startTime: 'desc' }
  })

  return shifts
})
