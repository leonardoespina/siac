import { prisma } from '../../../utils/prisma'
import { requireAuth, requirePermission } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  requirePermission(event, 'INSTITUTIONS', 'canUpdate')

  const id = parseInt(event.context.params?.id || '0')
  if (!id) throw createError({ statusCode: 400, message: 'ID inválido' })

  const body = await readBody(event)

  try {
    const institution = await prisma.institution.update({
      where: { id },
      data: {
        name: body.name,
        type: body.type,
        description: body.description,
        active: body.active
      }
    })
    
    // Log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'ACTUALIZAR',
        entity: 'INSTITUCION',
        entityId: institution.id,
        details: JSON.stringify(body)
      }
    })

    return institution
  } catch (error: any) {
    if (error.code === 'P2002') {
      throw createError({ statusCode: 400, message: 'Ya existe una institución con ese nombre' })
    }
    throw createError({ statusCode: 500, message: 'Error al actualizar la institución: ' + error.message })
  }
})
