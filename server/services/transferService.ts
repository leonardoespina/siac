import * as repo from '../repository/transferRepository'
import * as txRepo from '../repository/transactionRepository'
import { emitEvent } from '../utils/eventBus'
import { ValidationError } from '../domain/errors'
import type { UserContext, TransactionStatus } from '../domain/transaction'

export async function listTransfers() {
  return await repo.listTransfers()
}

export async function createTransfer(input: any, user: UserContext) {
  if (!input.sourceId || !input.destinationId) {
    throw new ValidationError('Faltan datos de almacenes de origen o destino')
  }
  if (input.sourceId === input.destinationId) {
    throw new ValidationError('El almacén de origen y destino no pueden ser el mismo')
  }
  if (!input.details || input.details.length === 0) {
    throw new ValidationError('La transferencia debe contener al menos un producto')
  }
  
  // 1. Crear en Base de Datos
  const transfer = await repo.createTransferDraft(
    input.sourceId, 
    input.destinationId, 
    input.details, 
    user
  )
  
  // 2. Emitir evento para desacoplar lógica futura (logs, notificaciones)
  emitEvent('transfer:created', { 
    id: transfer.id, 
    sourceId: transfer.sourceId!, 
    destinationId: transfer.destinationId! 
  })
  
  return transfer
}

export async function changeTransferStatus(id: number, status: TransactionStatus, user: UserContext, notes?: string) {
  // Utilizamos el repositorio general que ya contiene la lógica de máquina de estados
  const updated = await txRepo.updateStatus(id, status, user, notes)
  
  // Emitimos el evento
  emitEvent('transfer:status_changed', { id, status, userId: user.id })
  
  return updated
}
