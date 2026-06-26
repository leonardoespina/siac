/**
 * Interfaz central que representa un Producto en el catálogo maestro.
 * Contiene umbrales de stock y si es perecedero para control de vencimiento.
 */
export interface Product {
  id: number
  code: string
  name: string
  description: string | null
  categoryId: number
  unitId: number
  minimumStock: number
  maximumStock: number | null
  isPerishable: boolean
  active: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * Datos requeridos para crear o editar un Producto.
 * Las relaciones (categoría y unidad) se manejan por sus IDs.
 */
export interface CreateProductInput {
  code: string
  name: string
  description?: string
  categoryId: number
  unitId: number
  minimumStock?: number
  maximumStock?: number
  isPerishable?: boolean
  active?: boolean
}

/**
 * Función pura que valida las reglas de negocio de un Producto.
 * - Código y Nombre son obligatorios.
 * - Debe pertenecer a una Categoría y tener una Unidad.
 * - El stock mínimo (si se envía) no puede ser negativo.
 */
export function validateProduct(input: any): string[] {
  const errors: string[] = []
  if (!input.code || input.code.trim() === '') errors.push('El código es requerido')
  if (!input.name || input.name.trim() === '') errors.push('El nombre del producto es requerido')
  if (!input.categoryId) errors.push('Debe seleccionar una categoría')
  if (!input.unitId) errors.push('Debe seleccionar una unidad de medida')
  if (input.minimumStock !== undefined && input.minimumStock < 0) {
    errors.push('El stock mínimo no puede ser negativo')
  }
  return errors
}
