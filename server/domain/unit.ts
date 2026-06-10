/**
 * Interfaz que representa una Unidad de Medida física.
 * Ejemplos: Kilogramo (KG), Litro (L), Unidad (UN).
 */
export interface Unit {
  id: number
  name: string
  abbreviation: string
  active: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * Datos requeridos para crear una nueva Unidad de Medida.
 */
export interface CreateUnitInput {
  name: string
  abbreviation: string
}

/**
 * Función pura que valida las reglas de negocio de una Unidad de Medida.
 * Exige que tanto el nombre como la abreviación estén presentes.
 */
export function validateUnit(input: any): string[] {
  const errors: string[] = []
  if (!input.name || input.name.trim() === '') {
    errors.push('El nombre de la unidad es requerido')
  }
  if (!input.abbreviation || input.abbreviation.trim() === '') {
    errors.push('La abreviación es requerida')
  }
  return errors
}
