import { defineApiHandler } from '../../../utils/handler'
import * as repo from '../../../repository/transactionRepository'
import { requireAuth } from '../../../utils/auth'
import { prisma } from '../../../utils/prisma'

export default defineApiHandler(async (event) => {
  const userId = await requireAuth(event)
  const id = parseInt(event.context.params?.id || '0')
  const body = await readBody(event)
  
  if (!body.details || !Array.isArray(body.details)) {
    throw new Error('Faltan los detalles a actualizar')
  }

  // Cargar rol para las validaciones de negocio en el repositorio
  const userRecord = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true }
  })
  
  const userContext = { id: userRecord!.id, roleName: userRecord!.role.name }

  return await repo.updateDraftDetails(id, body.details, userContext)
})
