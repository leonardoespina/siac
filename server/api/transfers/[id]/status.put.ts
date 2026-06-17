import { defineApiHandler } from '../../../utils/handler'
import * as service from '../../../services/transferService'
import { requireAuth } from '../../../utils/auth'
import { TransactionStatus } from '../../../domain/transaction'
import { prisma } from '../../../utils/prisma'

export default defineApiHandler(async (event) => {
  const userId = await requireAuth(event)
  const id = parseInt(event.context.params?.id || '0')
  const body = await readBody(event)
  
  if (!body.status) {
    throw new Error('Estado requerido')
  }

  const userRecord = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true }
  })
  const userContext = { id: userRecord!.id, roleName: userRecord!.role.name }

  return await service.changeTransferStatus(id, body.status as TransactionStatus, userContext, body.notes)
})
