import { prisma } from '../utils/prisma'
import type { CreateWarehouseInput } from '../domain/warehouse'

/**
 * Obtiene todos los almacenes registrados (Centrales y Locales).
 */
export async function listAll() {
  return prisma.warehouse.findMany({
    orderBy: { name: 'asc' }
  })
}

/**
 * Crea un nuevo almacén (CENTRAL o LOCAL).
 */
export async function create(data: CreateWarehouseInput) {
  return prisma.warehouse.create({
    data: {
      name: data.name,
      type: data.type,
      location: data.location,
      active: true
    }
  })
}

/**
 * Cambia el estado del almacén (Borrado Lógico).
 */
export async function toggleStatus(id: number, active: boolean) {
  return prisma.warehouse.update({
    where: { id },
    data: { active }
  })
}
