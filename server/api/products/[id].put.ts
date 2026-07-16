import { defineApiHandler } from '../../utils/handler'
import * as repo from '../../repository/productRepository'
import { requireAdmin } from '../../utils/auth'
import { validateProduct } from '../../domain/product'
import { ValidationError, NotFoundError, ConflictError } from '../../domain/errors'
import { logAudit } from '../../utils/audit'
import { prisma } from '../../utils/prisma'

/**
 * Endpoint PUT /api/products/:id
 * Actualiza completamente los datos de un producto.
 * Valida disponibilidad del código y guarda auditoría.
 */
export default defineApiHandler(async (event) => {
  const userId = await requirePermission(event, 'PRODUCTS', 'update')
  const id = parseInt(event.context.params?.id || '0')
  if (!id) throw new ValidationError('ID inválido')

  const body = await readBody(event)
  const errors = validateProduct(body)
  if (errors.length > 0) throw new ValidationError(errors)

  const existing = await prisma.product.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError('Producto', id)

  if (body.code !== existing.code) {
    const codeCheck = await prisma.product.findUnique({ where: { code: body.code } })
    if (codeCheck) throw new ConflictError('Producto', `Ya existe otro producto con el código ${body.code}`)
  }

  const updated = await repo.update(id, {
    code: body.code,
    name: body.name,
    description: body.description,
    categoryId: body.categoryId,
    unitId: body.unitId,
    minimumStock: body.minimumStock,
    maximumStock: body.maximumStock,
    isPerishable: body.isPerishable,
    active: body.active !== false
  })

  await logAudit(userId, 'UPDATE', 'PRODUCT', updated.id, `Producto actualizado: ${updated.name}`)
  return updated
})
