import { prisma } from '../utils/prisma'
import { ConflictError, NotFoundError } from '../domain/errors'
import { validateSupplier, type SupplierData } from '../domain/supplier'

/**
 * Obtiene todos los proveedores ordenados alfabéticamente.
 */
export async function listAll() {
  return prisma.supplier.findMany({
    orderBy: { name: 'asc' }
  })
}

/**
 * Crea un proveedor validando colisiones de documento.
 */
export async function create(data: SupplierData) {
  validateSupplier(data)

  const exists = await prisma.supplier.findUnique({ where: { document: data.document } })
  if (exists) throw new ConflictError('Proveedor', 'Ya existe un proveedor con ese documento')

  return prisma.supplier.create({
    data: {
      document: data.document.trim(),
      name: data.name.trim(),
      address: data.address?.trim() || null,
      phone: data.phone?.trim() || null,
      email: data.email?.trim() || null,
      active: true
    }
  })
}

/**
 * Actualiza un proveedor.
 */
export async function update(id: number, data: Partial<SupplierData>) {
  validateSupplier({ ...data, document: data.document || 'XXX', name: data.name || 'XXX' })

  const existing = await prisma.supplier.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError('Proveedor', id.toString())

  if (data.document && data.document !== existing.document) {
    const colision = await prisma.supplier.findUnique({ where: { document: data.document } })
    if (colision) throw new ConflictError('Proveedor', 'Ese documento ya está en uso')
  }

  return prisma.supplier.update({
    where: { id },
    data: {
      document: data.document?.trim(),
      name: data.name?.trim(),
      address: data.address?.trim() !== undefined ? data.address.trim() : undefined,
      phone: data.phone?.trim() !== undefined ? data.phone.trim() : undefined,
      email: data.email?.trim() !== undefined ? data.email.trim() : undefined,
      active: data.active
    }
  })
}

/**
 * Desactiva un proveedor lógicamente.
 */
export async function remove(id: number) {
  const existing = await prisma.supplier.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError('Proveedor', id.toString())

  return prisma.supplier.update({
    where: { id },
    data: { active: false }
  })
}
