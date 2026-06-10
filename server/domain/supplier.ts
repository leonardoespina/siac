import { ValidationError } from './errors'

/**
 * Interface del Dominio para Proveedores.
 */
export interface SupplierData {
  document: string
  name: string
  address?: string
  phone?: string
  email?: string
  active?: boolean
}

/**
 * Valida los datos antes de crear o actualizar un Proveedor.
 */
export function validateSupplier(data: Partial<SupplierData>) {
  if (!data.document || data.document.trim().length < 3) {
    throw new ValidationError('El documento (RIF/NIT) es obligatorio y debe tener al menos 3 caracteres.')
  }
  if (!data.name || data.name.trim().length < 2) {
    throw new ValidationError('El nombre o razón social es obligatorio.')
  }
  
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    throw new ValidationError('El formato del correo electrónico es inválido.')
  }
}
