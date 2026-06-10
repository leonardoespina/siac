import { defineApiHandler } from '../../utils/handler'
import * as repo from '../../repository/warehouseRepository'
import { requireAdmin } from '../../utils/auth'
import { validateWarehouse } from '../../domain/warehouse'
import { ValidationError, ConflictError } from '../../domain/errors'
import { logAudit } from '../../utils/audit'
import { prisma } from '../../utils/prisma'

/**
 * Endpoint POST /api/warehouses
 * Crea un nuevo almacén (CENTRAL o LOCAL).
 * Solo administradores. Valida duplicados de nombre.
 */
export default defineApiHandler(async (event) => {
  const admin = await requireAdmin(event)
  const body = await readBody(event)
  
  const errors = validateWarehouse(body)
  if (errors.length > 0) throw new ValidationError(errors)

  const existing = await prisma.warehouse.findUnique({ where: { name: body.name } })
  if (existing) throw new ConflictError('Almacén', 'Ya existe un almacén con este nombre')

  const warehouse = await repo.create(body)
  await logAudit(admin.id, 'CREATE', 'WAREHOUSE', warehouse.id, `Almacén creado: ${warehouse.name} (${warehouse.type})`)
  
  setResponseStatus(event, 201)
  return warehouse
})
