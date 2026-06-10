import { defineApiHandler } from '../../utils/handler'
import * as repo from '../../repository/warehouseRepository'
import { requireAdmin } from '../../utils/auth'
import { validateWarehouse } from '../../domain/warehouse'
import { ValidationError, NotFoundError, ConflictError } from '../../domain/errors'
import { logAudit } from '../../utils/audit'
import { prisma } from '../../utils/prisma'

/**
 * Endpoint PUT /api/warehouses/:id
 * Modifica los datos y configuración de un almacén existente.
 * Requiere permisos de administrador. Registra el cambio en auditoría.
 */
export default defineApiHandler(async (event) => {
  const admin = await requireAdmin(event)
  const id = parseInt(event.context.params?.id || '0')
  if (!id) throw new ValidationError('ID inválido')

  const body = await readBody(event)
  const errors = validateWarehouse(body)
  if (errors.length > 0) throw new ValidationError(errors)

  const existing = await prisma.warehouse.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError('Almacén', id)

  if (body.name !== existing.name) {
    const nameCheck = await prisma.warehouse.findUnique({ where: { name: body.name } })
    if (nameCheck) throw new ConflictError('Almacén', 'Ya existe otro almacén con este nombre')
  }

  const updated = await prisma.warehouse.update({
    where: { id },
    data: { name: body.name, type: body.type, location: body.location, active: body.active !== false }
  })

  await logAudit(admin.id, 'UPDATE', 'WAREHOUSE', updated.id, `Almacén actualizado: ${updated.name}`)
  return updated
})
