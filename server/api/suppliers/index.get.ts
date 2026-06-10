import { defineApiHandler } from '../../utils/handler'
import * as repo from '../../repository/supplierRepository'
import { requireAuth } from '../../utils/auth'

/**
 * Endpoint GET /api/suppliers
 * Retorna todos los proveedores.
 */
export default defineApiHandler(async (event) => {
  await requireAuth(event)
  return await repo.listAll()
})
