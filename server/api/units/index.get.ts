import { defineApiHandler } from '../../utils/handler'
import * as repo from '../../repository/unitRepository'
import { requireAuth } from '../../utils/auth'

/**
 * Endpoint GET /api/units
 * Lista todas las unidades de medida disponibles.
 * Requiere autenticación básica.
 */
export default defineApiHandler(async (event) => {
  await requireAuth(event)
  return await repo.listAll()
})
