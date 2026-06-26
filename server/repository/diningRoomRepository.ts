import { prisma } from '../utils/prisma'

export async function listAll() {
  return await prisma.diningRoom.findMany({
    where: { active: true },
    include: {
      warehouse: {
        select: {
          id: true,
          name: true
        }
      }
    },
    orderBy: { name: 'asc' }
  })
}

export async function createDiningRoom(name: string, warehouseId?: number) {
  return await prisma.diningRoom.create({
    data: {
      name: name.toUpperCase().trim(),
      warehouseId
    }
  })
}
