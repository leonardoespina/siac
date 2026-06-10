import { defineApiHandler } from '../../utils/handler'
import * as repo from '../../repository/warehouseRepository'
import { requireAdmin } from '../../utils/auth'
import { ValidationError, NotFoundError } from '../../domain/errors'
import { logAudit } from '../../utils/audit'
import { prisma } from '../../utils/prisma'

/**
 * Endpoint DELETE /api/warehouses/:id
 * Desactiva un almacén para evitar que siga operando.
 * Protegido solo para administradores.
 */
export default defineApiHandler(async (event) => {
  const admin = await requireAdmin(event)
  const id = parseInt(event.context.params?.id || '0')
  if (!id) throw new ValidationError('ID inválido')

  const existing = await prisma.warehouse.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError('Almacén', id)

  const updated = await repo.toggleStatus(id, false)
  await logAudit(admin.id, 'DELETE', 'WAREHOUSE', id, `Almacén desactivado: ${existing.name}`)
  
  return updated
})
