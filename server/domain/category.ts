/**
 * Interfaz principal que representa una Categoría en el sistema.
 * Las categorías agrupan los productos (ej. Lácteos, Carnes, Limpieza).
 */
export interface Category {
  id: number
  name: string
  description: string | null
  active: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * Interfaz para la creación o edición de una Categoría.
 * Omite campos autogenerados por la base de datos como ID y fechas.
 */
export interface CreateCategoryInput {
  name: string
  description?: string
}

/**
 * Valida de forma pura (sin dependencias externas) que los datos
 * de una categoría sean correctos antes de guardarlos.
 * @param input Objeto con los datos a validar
 * @returns Array de strings con los mensajes de error. Vacío si es válido.
 */
export function validateCategory(input: any): string[] {
  const errors: string[] = []
  if (!input.name || input.name.trim() === '') {
    errors.push('El nombre de la categoría es requerido')
  }
  return errors
}
