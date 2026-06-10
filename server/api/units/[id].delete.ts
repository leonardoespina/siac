import { defineApiHandler } from '../../utils/handler'
import * as repo from '../../repository/unitRepository'
import { requireAdmin } from '../../utils/auth'
import { ValidationError, NotFoundError } from '../../domain/errors'
import { logAudit } from '../../utils/audit'
import { prisma } from '../../utils/prisma'

/**
 * Endpoint DELETE /api/units/:id
 * Desactiva una unidad de medida del sistema.
 * Acción restringida a administradores.
 */
export default defineApiHandler(async (event) => {
  const admin = await requireAdmin(event)
  const id = parseInt(event.context.params?.id || '0')
  if (!id) throw new ValidationError('ID inválido')

  const existing = await prisma.unit.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError('Unidad', id)

  const updated = await repo.toggleStatus(id, false)
  await logAudit(admin.id, 'DELETE', 'UNIT', id, `Unidad desactivada: ${existing.name}`)
  
  return updated
})
