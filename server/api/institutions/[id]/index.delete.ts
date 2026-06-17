import { prisma } from '../../../utils/prisma'
import { requireAuth, requirePermission } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = requireAuth(event)
  requirePermission(event, 'INSTITUTIONS', 'canDelete')

  const id = parseInt(event.context.params?.id || '0')
  if (!id) throw createError({ statusCode: 400, message: 'ID inválido' })

  try {
    // Validar si tiene transacciones asociadas
    const count = await prisma.transaction.count({
      where: { institutionId: id }
    })
    
    if (count > 0) {
      // Soft delete o bloqueo
      throw createError({ 
        statusCode: 400, 
        message: 'No se puede eliminar la institución porque tiene apoyos registrados. Desactívela en su lugar.' 
      })
    }

    await prisma.institution.delete({ where: { id } })
    
    // Log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'ELIMINAR',
        entity: 'INSTITUCION',
        entityId: id,
        details: 'Institución eliminada físicamente'
      }
    })

    return { success: true }
  } catch (error: any) {
    throw createError({ statusCode: error.statusCode || 500, message: error.message })
  }
})
