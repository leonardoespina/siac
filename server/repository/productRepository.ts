import { prisma } from '../utils/prisma'
import type { CreateProductInput } from '../domain/product'

/**
 * Obtiene todos los productos incluyendo su categoría y unidad.
 */
export async function listAll() {
  return prisma.product.findMany({
    include: {
      category: true,
      unit: true,
      stocks: true
    },
    orderBy: { name: 'asc' }
  })
}

/**
 * Crea un producto en el catálogo y devuelve el producto con sus relaciones.
 */
export async function create(data: CreateProductInput) {
  return prisma.product.create({
    data: {
      code: data.code,
      name: data.name,
      description: data.description,
      categoryId: data.categoryId,
      unitId: data.unitId,
      minimumStock: data.minimumStock || 0,
      maximumStock: data.maximumStock,
      isPerishable: data.isPerishable || false,
      active: true
    },
    include: {
      category: true,
      unit: true
    }
  })
}

/**
 * Actualiza los datos de un producto existente.
 */
export async function update(id: number, data: Partial<CreateProductInput>) {
  return prisma.product.update({
    where: { id },
    data,
    include: {
      category: true,
      unit: true
    }
  })
}

/**
 * Activa o desactiva (borrado lógico) un producto del catálogo.
 */
export async function toggleStatus(id: number, active: boolean) {
  return prisma.product.update({
    where: { id },
    data: { active }
  })
}
