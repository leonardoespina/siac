import { defineApiHandler } from '../../utils/handler'
import * as repo from '../../repository/categoryRepository'
import { requireAuth } from '../../utils/auth'

/**
 * Endpoint GET /api/categories
 * Obtiene el listado completo de categorías.
 * Requiere que el usuario esté autenticado.
 */
export default defineApiHandler(async (event) => {
  await requireAuth(event)
  return await repo.listAll()
})
