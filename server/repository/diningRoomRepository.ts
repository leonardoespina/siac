import { prisma } from '../utils/prisma'

export async function listAll() {
  return await prisma.diningRoom.findMany({
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

export async function createDiningRoom(name: string, warehouseId?: number | null) {
  return await prisma.diningRoom.create({
    data: {
      name: name.toUpperCase().trim(),
      warehouseId
    },
    include: {
      warehouse: {
        select: { id: true, name: true }
      }
    }
  })
}

export async function updateDiningRoom(id: number, name: string, warehouseId?: number | null, active?: boolean) {
  return await prisma.diningRoom.update({
    where: { id },
    data: {
      name: name.toUpperCase().trim(),
      warehouseId,
      ...(active !== undefined && { active })
    },
    include: {
      warehouse: {
        select: { id: true, name: true }
      }
    }
  })
}

export async function toggleStatus(id: number, active: boolean) {
  return await prisma.diningRoom.update({
    where: { id },
    data: { active }
  })
}
