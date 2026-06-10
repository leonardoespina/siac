import { defineApiHandler } from '../../utils/handler'
import * as repo from '../../repository/warehouseRepository'
import { requireAuth } from '../../utils/auth'

/**
 * Endpoint GET /api/warehouses
 * Lista todos los almacenes registrados en el sistema.
 * Requiere que el usuario esté autenticado.
 */
export default defineApiHandler(async (event) => {
  await requireAuth(event)
  return await repo.listAll()
})
