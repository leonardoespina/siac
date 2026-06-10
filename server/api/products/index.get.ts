import { defineApiHandler } from '../../utils/handler'
import * as repo from '../../repository/productRepository'
import { requireAuth } from '../../utils/auth'

/**
 * Endpoint GET /api/products
 * Obtiene el catálogo completo de productos con sus relaciones (Categoría y Unidad).
 * Todos los usuarios autenticados pueden ver el catálogo.
 */
export default defineApiHandler(async (event) => {
  await requireAuth(event)
  return await repo.listAll()
})
