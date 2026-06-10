import { prisma } from '../utils/prisma'
import type { CreateUnitInput } from '../domain/unit'

/**
 * Obtiene todas las unidades de medida registradas.
 */
export async function listAll() {
  return prisma.unit.findMany({
    orderBy: { name: 'asc' }
  })
}

/**
 * Crea una nueva unidad de medida y fuerza que la abreviación sea mayúscula.
 */
export async function create(data: CreateUnitInput) {
  return prisma.unit.create({
    data: {
      name: data.name,
      abbreviation: data.abbreviation.toUpperCase(),
      active: true
    }
  })
}

/**
 * Cambia el estado de una unidad de medida (borrado lógico).
 */
export async function toggleStatus(id: number, active: boolean) {
  return prisma.unit.update({
    where: { id },
    data: { active }
  })
}
