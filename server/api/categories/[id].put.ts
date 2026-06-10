import { defineApiHandler } from '../../utils/handler'
import * as repo from '../../repository/categoryRepository'
import { requireAdmin } from '../../utils/auth'
import { validateCategory } from '../../domain/category'
import { ValidationError, NotFoundError, ConflictError } from '../../domain/errors'
import { logAudit } from '../../utils/audit'
import { prisma } from '../../utils/prisma'

/**
 * Endpoint PUT /api/categories/:id
 * Actualiza la información de una categoría existente.
 * Solo administradores. Valida colisiones de nombre y audita el cambio.
 */
export default defineApiHandler(async (event) => {
  const admin = await requireAdmin(event)
  const id = parseInt(event.context.params?.id || '0')
  if (!id) throw new ValidationError('ID inválido')

  const body = await readBody(event)
  const errors = validateCategory(body)
  if (errors.length > 0) throw new ValidationError(errors)

  const existing = await prisma.category.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError('Categoría', id)

  if (body.name !== existing.name) {
    const nameCheck = await prisma.category.findUnique({ where: { name: body.name } })
    if (nameCheck) throw new ConflictError('Categoría', 'Ya existe otra categoría con este nombre')
  }

  const updated = await prisma.category.update({
    where: { id },
    data: { name: body.name, description: body.description, active: body.active !== false }
  })

  await logAudit(admin.id, 'UPDATE', 'CATEGORY', updated.id, `Categoría actualizada: ${updated.name}`)
  return updated
})
