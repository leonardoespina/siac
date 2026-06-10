/**
 * Los tipos permitidos de almacén.
 * CENTRAL: Recibe mercancía y distribuye.
 * LOCAL: Comedores que consumen directamente.
 */
export type WarehouseType = 'CENTRAL' | 'LOCAL'

/**
 * Representa un espacio físico de inventario.
 */
export interface Warehouse {
  id: number
  name: string
  type: WarehouseType
  location: string | null
  active: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * Datos para crear un nuevo Almacén.
 */
export interface CreateWarehouseInput {
  name: string
  type: WarehouseType
  location?: string
}

/**
 * Función pura que valida la creación de un Almacén.
 * Asegura que tenga nombre y que el tipo sea estrictamente CENTRAL o LOCAL.
 */
export function validateWarehouse(input: any): string[] {
  const errors: string[] = []
  if (!input.name || input.name.trim() === '') errors.push('El nombre del almacén es requerido')
  if (input.type !== 'CENTRAL' && input.type !== 'LOCAL') {
    errors.push('El tipo de almacén es inválido')
  }
  return errors
}
