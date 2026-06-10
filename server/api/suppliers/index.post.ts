import { defineApiHandler } from '../../utils/handler'
import * as repo from '../../repository/supplierRepository'
import { requireAdmin } from '../../utils/auth'
import { logAudit } from '../../utils/audit'

/**
 * Endpoint POST /api/suppliers
 */
export default defineApiHandler(async (event) => {
  const admin = await requireAdmin(event)
  const body = await readBody(event)
  
  const created = await repo.create(body)
  await logAudit(admin.id, 'CREATE', 'SUPPLIER', created.id, `Proveedor registrado: ${created.name}`)
  
  return created
})
