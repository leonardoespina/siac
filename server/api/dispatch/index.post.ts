import { defineApiHandler } from '../../utils/handler'
import { requirePermission } from '../../utils/auth'
import * as dinerRepo from '../../repository/dinerRepository'

export default defineApiHandler(async (event) => {
  // Para registrar despachos, el operador debe tener permiso de lectura sobre DINERS
  // o se podría crear un módulo específico DISPATCH.
  await requirePermission(event, 'DINERS', 'read')

  const body = await readBody(event)
  const { identifier } = body // identifier es la cédula

  if (!identifier) {
    throw createError({ statusCode: 400, message: 'Identificador requerido (cédula)' })
  }

  // Ahora SIEMPRE buscamos por cédula, ya que la validación biométrica se hace en el Kiosco local (C#)
  const diner = await dinerRepo.getDinerByCedula(identifier)

  if (!diner) {
    throw createError({ statusCode: 404, message: 'Comensal no encontrado o huella no registrada.' })
  }
  
  if (!diner.active) {
    throw createError({ statusCode: 403, message: 'Comensal inactivo.' })
  }

  // TODO: Futuro - Registrar la comida entregada (crear TransactionType.CONSUMPTION
  // o log de auditoría especializado).

  return {
    authorized: true,
    diner: {
      id: diner.id,
      name: diner.name,
      cedula: diner.cedula,
      rationType: diner.rationType,
      squadName: diner.squad?.name || 'Sin cuadrilla',
      diningRoomName: diner.diningRoom?.name || 'Comedor Principal'
    },
    message: 'Despacho Autorizado'
  }
})
