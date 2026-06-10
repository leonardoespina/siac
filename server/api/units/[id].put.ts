import { defineApiHandler } from '../../utils/handler'
import * as repo from '../../repository/unitRepository'
import { requireAdmin } from '../../utils/auth'
import { validateUnit } from '../../domain/unit'
import { ValidationError, NotFoundError, ConflictError } from '../../domain/errors'
import { logAudit } from '../../utils/audit'
import { prisma } from '../../utils/prisma'

/**
 * Endpoint PUT /api/units/:id
 * Edita una unidad de medida existente.
 * Solo administradores. Verifica conflictos de abreviación.
 */
export default defineApiHandler(async (event) => {
  const admin = await requireAdmin(event)
  const id = parseInt(event.context.params?.id || '0')
  if (!id) throw new ValidationError('ID inválido')

  const body = await readBody(event)
  const errors = validateUnit(body)
  if (errors.length > 0) throw new ValidationError(errors)

  const existing = await prisma.unit.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError('Unidad', id)

  const abbr = body.abbreviation.toUpperCase()
  if (abbr !== existing.abbreviation) {
    const abbrCheck = await prisma.unit.findUnique({ where: { abbreviation: abbr } })
    if (abbrCheck) throw new ConflictError('Unidad', 'Ya existe otra unidad con esta abreviación')
  }

  const updated = await prisma.unit.update({
    where: { id },
    data: { name: body.name, abbreviation: abbr, active: body.active !== false }
  })

  await logAudit(admin.id, 'UPDATE', 'UNIT', updated.id, `Unidad actualizada: ${updated.name}`)
  return updated
})
