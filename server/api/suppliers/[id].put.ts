import { defineApiHandler } from '../../utils/handler'
import * as repo from '../../repository/supplierRepository'
import { requireAdmin } from '../../utils/auth'
import { logAudit } from '../../utils/audit'

/**
 * Endpoint PUT /api/suppliers/:id
 */
export default defineApiHandler(async (event) => {
  const admin = await requireAdmin(event)
  const id = parseInt(event.context.params?.id || '0')
  const body = await readBody(event)

  const updated = await repo.update(id, body)
  await logAudit(admin.id, 'UPDATE', 'SUPPLIER', updated.id, `Proveedor actualizado: ${updated.name}`)

  return updated
})
