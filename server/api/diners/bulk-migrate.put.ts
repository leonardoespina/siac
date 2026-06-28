import { defineApiHandler } from '../../utils/handler'
import { bulkMigrate } from '../../services/dinerService'

export default defineApiHandler(async (event) => {
  const body = await readBody(event)
  
  if (!body.dinerIds || !Array.isArray(body.dinerIds)) {
    throw new Error('ValidationError: Payload inválido, se requiere un arreglo de dinerIds.')
  }

  const result = await bulkMigrate(body.dinerIds, body.targetDiningRoomId)

  setResponseStatus(event, 200)
  return { 
    success: true, 
    message: `${result.count} comensales migrados exitosamente.`,
    data: result 
  }
})
