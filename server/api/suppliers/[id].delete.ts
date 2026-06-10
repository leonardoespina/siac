import { defineApiHandler } from '../../utils/handler'
import * as repo from '../../repository/supplierRepository'
import { requireAdmin } from '../../utils/auth'
import { logAudit } from '../../utils/audit'

/**
 * Endpoint DELETE /api/suppliers/:id
 */
export default defineApiHandler(async (event) => {
  const admin = await requireAdmin(event)
  const id = parseInt(event.context.params?.id || '0')

  const removed = await repo.remove(id)
  await logAudit(admin.id, 'DELETE', 'SUPPLIER', removed.id, `Proveedor desactivado: ${removed.name}`)

  return removed
})
