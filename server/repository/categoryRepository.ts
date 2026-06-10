import { prisma } from '../utils/prisma'
import type { CreateCategoryInput } from '../domain/category'

/**
 * Obtiene todas las categorías de la base de datos.
 * Ordenadas alfabéticamente por nombre.
 */
export async function listAll() {
  return prisma.category.findMany({
    orderBy: { name: 'asc' }
  })
}

/**
 * Crea una nueva categoría en la base de datos.
 * @param data Datos validados de la categoría
 */
export async function create(data: CreateCategoryInput) {
  return prisma.category.create({
    data: {
      name: data.name,
      description: data.description,
      active: true
    }
  })
}

/**
 * Activa o desactiva (borrado lógico) una categoría.
 * @param id Identificador de la categoría
 * @param active Estado deseado (true = activo, false = inactivo)
 */
export async function toggleStatus(id: number, active: boolean) {
  return prisma.category.update({
    where: { id },
    data: { active }
  })
}
