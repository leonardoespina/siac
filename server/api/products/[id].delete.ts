import { defineApiHandler } from '../../utils/handler'
import * as repo from '../../repository/productRepository'
import { requireAdmin } from '../../utils/auth'
import { ValidationError, NotFoundError } from '../../domain/errors'
import { logAudit } from '../../utils/audit'
import { prisma } from '../../utils/prisma'

/**
 * Endpoint DELETE /api/products/:id
 * Saca de circulación (borrado lógico) a un producto del catálogo.
 * Solo administradores pueden ejecutar esta acción.
 */
export default defineApiHandler(async (event) => {
  const admin = await requireAdmin(event)
  const id = parseInt(event.context.params?.id || '0')
  if (!id) throw new ValidationError('ID inválido')

  const existing = await prisma.product.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError('Producto', id)

  const updated = await repo.toggleStatus(id, false)
  await logAudit(admin.id, 'DELETE', 'PRODUCT', id, `Producto desactivado: ${existing.name}`)
  
  return updated
})
