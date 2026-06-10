import { defineApiHandler } from '../../utils/handler'
import * as repo from '../../repository/categoryRepository'
import { requireAdmin } from '../../utils/auth'
import { ValidationError, NotFoundError } from '../../domain/errors'
import { logAudit } from '../../utils/audit'
import { prisma } from '../../utils/prisma'

/**
 * Endpoint DELETE /api/categories/:id
 * Realiza un borrado lógico (desactivación) de una categoría.
 * Solo administradores. Registra la acción en auditoría.
 */
export default defineApiHandler(async (event) => {
  const admin = await requireAdmin(event)
  const id = parseInt(event.context.params?.id || '0')
  if (!id) throw new ValidationError('ID inválido')

  const existing = await prisma.category.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError('Categoría', id)

  const updated = await repo.toggleStatus(id, false)
  await logAudit(admin.id, 'DELETE', 'CATEGORY', id, `Categoría desactivada: ${existing.name}`)
  
  return updated
})
