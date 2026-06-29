import { defineApiHandler } from '../../utils/handler'
import * as repo from '../../repository/transactionRepository'
import { requirePermission, requireUserContext } from '../../utils/auth'
import { ValidationError } from '../../domain/errors'

export default defineApiHandler(async (event) => {
  await requirePermission(event, 'OPERATIONS', 'create')
  const user = await requireUserContext(event)
  const body = await readBody(event)
  
  // Soporte Modo Dios: si no tiene warehouseId, lo tomamos del body
  const targetWarehouseId = user.warehouseId || Number(body.warehouseId)
  if (!targetWarehouseId) {
    throw new ValidationError(['Debes especificar un almacén de origen.'])
  }
  
  // Inyectamos el warehouseId destino en el usuario para engañar al repositorio
  const proxyUser = { ...user, warehouseId: targetWarehouseId }
  
  // type puede ser 'CONSUMPTION' o 'LOSS'
  const type = body.type || 'CONSUMPTION'
  
  const consumption = await repo.createConsumption(body, proxyUser, type)
  setResponseStatus(event, 201)
  return consumption
})
