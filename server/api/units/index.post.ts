import { defineApiHandler } from '../../utils/handler'
import * as repo from '../../repository/unitRepository'
import { requireAdmin } from '../../utils/auth'
import { validateUnit } from '../../domain/unit'
import { ValidationError, ConflictError } from '../../domain/errors'
import { logAudit } from '../../utils/audit'
import { prisma } from '../../utils/prisma'

/**
 * Endpoint POST /api/units
 * Crea una nueva unidad de medida.
 * Solo administradores. Exige abreviaciones únicas (ej. KG).
 */
export default defineApiHandler(async (event) => {
  const admin = await requireAdmin(event)
  const body = await readBody(event)
  
  const errors = validateUnit(body)
  if (errors.length > 0) throw new ValidationError(errors)

  const existing = await prisma.unit.findUnique({ where: { abbreviation: body.abbreviation.toUpperCase() } })
  if (existing) throw new ConflictError('Unidad', 'Ya existe una unidad con esta abreviación')

  const unit = await repo.create(body)
  await logAudit(admin.id, 'CREATE', 'UNIT', unit.id, `Unidad creada: ${unit.name}`)
  
  setResponseStatus(event, 201)
  return unit
})
