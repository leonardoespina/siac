import { defineApiHandler } from '../../utils/handler'
import * as repo from '../../repository/categoryRepository'
import { requireAdmin } from '../../utils/auth'
import { validateCategory } from '../../domain/category'
import { ValidationError, ConflictError } from '../../domain/errors'
import { logAudit } from '../../utils/audit'
import { prisma } from '../../utils/prisma'

/**
 * Endpoint POST /api/categories
 * Crea una nueva categoría en el sistema.
 * Solo accesible por administradores. Valida duplicados y registra auditoría.
 */
export default defineApiHandler(async (event) => {
  const admin = await requireAdmin(event)
  const body = await readBody(event)
  
  const errors = validateCategory(body)
  if (errors.length > 0) throw new ValidationError(errors)

  const existing = await prisma.category.findUnique({ where: { name: body.name } })
  if (existing) throw new ConflictError('Categoría', 'Ya existe una categoría con este nombre')

  const category = await repo.create(body)
  await logAudit(admin.id, 'CREATE', 'CATEGORY', category.id, `Categoría creada: ${category.name}`)
  
  setResponseStatus(event, 201)
  return category
})
