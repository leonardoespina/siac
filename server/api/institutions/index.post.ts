import { prisma } from '../../utils/prisma'
import { requireAuth, requirePermission } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const userId = await requireAuth(event)
  await requirePermission(event, 'INSTITUTIONS', 'create')

  const body = await readBody(event)

  if (!body.name) {
    throw createError({ statusCode: 400, message: 'El nombre de la institución es obligatorio' })
  }

  try {
    const institution = await prisma.institution.create({
      data: {
        name: body.name,
        type: body.type,
        description: body.description,
        active: body.active !== undefined ? body.active : true
      }
    })
    
    // Log
    await prisma.auditLog.create({
      data: {
        userId: userId,
        action: 'CREAR',
        entity: 'INSTITUCION',
        entityId: institution.id,
        details: JSON.stringify(institution)
      }
    })

    return institution
  } catch (error: any) {
    if (error.code === 'P2002') {
      throw createError({ statusCode: 400, message: 'Ya existe una institución con ese nombre' })
    }
    throw createError({ statusCode: 500, message: 'Error al crear la institución: ' + error.message })
  }
})
