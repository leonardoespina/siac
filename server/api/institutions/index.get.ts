import { prisma } from '../../utils/prisma'
import { requireAuth, requirePermission } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  requireAuth(event)
  // Permiso mínimo de lectura en el catálogo de Instituciones o estar en Kitchen Operaciones
  // requirePermission(event, 'INSTITUTIONS', 'canRead') // Lo manejaremos en el frontend

  const query = getQuery(event)
  const onlyActive = query.active === 'true'

  try {
    const institutions = await prisma.institution.findMany({
      where: onlyActive ? { active: true } : undefined,
      orderBy: { name: 'asc' }
    })
    return institutions
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: 'Error al obtener instituciones: ' + error.message
    })
  }
})
