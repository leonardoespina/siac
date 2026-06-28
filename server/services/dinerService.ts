/**
 * SERVICIO: Comensales (Orquestador)
 * 
 * REGLAS DE ARQUITECTURA:
 * - El puente entre el Dominio (reglas) y el Repositorio (BD).
 * - No conoce de HTTP (Requests, Responses).
 * - Dispara eventos del sistema (EventBus).
 */

import * as dinerRepo from '../repository/dinerRepository'
import { isLeadTimeValid } from '../domain/diners'
import { emitEvent } from '../utils/eventBus'

/**
 * Procesa la creación de una nueva solicitud masiva de comensales.
 * 
 * @param targetDate Fecha para la que se requiere la comida.
 * @param shiftType Turno requerido (DESAYUNO, ALMUERZO, etc).
 * @param supervisorId ID del usuario que solicita.
 * @param dinersList Array con los IDs de los comensales y su dieta.
 */
export async function submitDinerRequest(
  targetDate: Date, 
  shiftType: string, 
  supervisorId: number, 
  dinersList: Array<{ dinerId: number, rationType: string }>
) {
  const requestDate = new Date()

  // 1. Validaciones Puras de Dominio
  if (!isLeadTimeValid(requestDate, targetDate)) {
    throw new Error('ValidationError: Debe solicitar la comida con al menos 24 horas de anticipación.')
  }

  if (dinersList.length === 0) {
    throw new Error('ValidationError: La petición debe incluir al menos un comensal.')
  }

  // 2. Transacción de Base de Datos a través del Repositorio
  const newRequest = await dinerRepo.createDinerRequest({
    date: targetDate,
    shiftType,
    createdById: supervisorId,
    diners: dinersList
  })

  // 3. Emisión de Eventos Desacoplados
  // Esto permite que el archivo de notificaciones (eventListeners.ts) mande
  // un aviso a los aprobadores sin ensuciar el código de este servicio.
  emitEvent('dinerRequest:created', { 
    requestId: newRequest.id, 
    subdependencyId: newRequest.createdById // Para notificar al aprobador de la misma subdependencia
  })

  return newRequest
}

/**
 * Aprueba una petición existente.
 */
export async function approveDinerRequest(requestId: number, approverId: number) {
  // Validar si la petición existe y está pendiente
  const request = await dinerRepo.getRequestById(requestId)
  if (!request) {
    throw new Error('NotFoundError: La petición no existe.')
  }
  if (request.status !== 'PENDING') {
    throw new Error('StateError: La petición ya fue procesada.')
  }

  // Marcar como aprobada en DB
  const updatedRequest = await dinerRepo.updateRequestStatus(requestId, 'APPROVED', approverId)

  // Emitir evento para la cocina (Ej: "Preparen 50 platos más")
  emitEvent('dinerRequest:approved', { 
    requestId: updatedRequest.id,
    shiftType: updatedRequest.shiftType,
    date: updatedRequest.date
  })

  return updatedRequest
}

/**
 * Migra masivamente a un grupo de comensales a un nuevo comedor.
 * 
 * @param dinerIds Arreglo de IDs de los comensales a mover.
 * @param targetDiningRoomId ID del comedor destino.
 */
export async function bulkMigrate(dinerIds: number[], targetDiningRoomId: number) {
  if (!dinerIds || dinerIds.length === 0) {
    throw new Error('ValidationError: Debe proveer al menos un comensal para migrar.')
  }
  if (!targetDiningRoomId) {
    throw new Error('ValidationError: Debe especificar un comedor destino.')
  }

  // Delegar al repositorio la actualización masiva
  const result = await dinerRepo.updateDiningRoomBulk(dinerIds, targetDiningRoomId)
  
  // Emitir evento por si otros sistemas necesitan reaccionar
  emitEvent('diner:migratedBulk', { count: result.count, targetDiningRoomId })

  return result
}
