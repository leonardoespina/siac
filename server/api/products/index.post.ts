import { defineApiHandler } from '../../utils/handler'
import * as repo from '../../repository/productRepository'
import { requirePermission } from '../../utils/auth'
import { validateProduct } from '../../domain/product'
import { ValidationError, ConflictError } from '../../domain/errors'
import { logAudit } from '../../utils/audit'
import { prisma } from '../../utils/prisma'

/**
 * Endpoint POST /api/products
 * Crea un producto en el catálogo maestro.
 * Valida reglas de stock mínimo y colisiones de SKU/Código.
 */
export default defineApiHandler(async (event) => {
  const userId = await requirePermission(event, 'PRODUCTS', 'create')
  const body = await readBody(event)
  
  const errors = validateProduct(body)
  if (errors.length > 0) throw new ValidationError(errors)

  const existing = await prisma.product.findUnique({ where: { code: body.code } })
  if (existing) throw new ConflictError('Producto', `Ya existe un producto con el código ${body.code}`)

  const product = await repo.create(body)
  await logAudit(userId, 'CREATE', 'PRODUCT', product.id, `Producto creado: ${product.name} (${product.code})`)
  
  setResponseStatus(event, 201)
  return product
})
