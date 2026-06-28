import { ValidationError, UnauthorizedError } from './errors'

export type TransactionStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CONFIRMED'
export type TransactionType = 'RECEPTION' | 'TRANSFER' | 'ADJUSTMENT'

export interface UserContext {
  id: number
  roleName: string
  warehouseId?: number | null
  diningRoomId?: number | null
}

/**
 * Valida si una transición de estado es matemáticamente y lógicamente posible.
 */
export function validateStateTransition(currentStatus: TransactionStatus, newStatus: TransactionStatus) {
  const validTransitions: Record<TransactionStatus, TransactionStatus[]> = {
    DRAFT: ['PENDING'],
    PENDING: ['APPROVED', 'REJECTED', 'CONFIRMED'],
    APPROVED: ['CONFIRMED'],
    REJECTED: [],
    CONFIRMED: []
  }

  const allowed = validTransitions[currentStatus]
  if (!allowed.includes(newStatus)) {
    throw new ValidationError(`Transición de estado inválida: No se puede pasar de ${currentStatus} a ${newStatus}.`)
  }
}

/**
 * Valida las reglas de negocio de la aprobación gerencial.
 */
export function validateApproval(currentStatus: TransactionStatus, creatorId: number, approver: UserContext) {
  if (currentStatus !== 'PENDING') {
    throw new ValidationError('Solo se pueden aprobar o rechazar transacciones en estado PENDIENTE.')
  }
  
  // En producción estricta, descomentar:
  // if (creatorId === approver.id) {
  //   throw new UnauthorizedError('No puedes aprobar una transacción creada por ti mismo (Segregación de funciones).')
  // }
  
  // La validación de autoridad ahora se delega a los middlewares de la API
  // mediante los módulos 'APPROVAL_RECEPTIONS' y 'APPROVAL_TRANSFERS'.
}

/**
 * Valida las reglas de un ítem dentro de la transacción.
 */
export function validateTransactionItem(item: { quantity: number; expirationDate?: Date | null }) {
  if (item.quantity <= 0) {
    throw new ValidationError('La cantidad debe ser mayor a cero.')
  }

  if (item.expirationDate) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const expDate = new Date(item.expirationDate)
    expDate.setHours(0, 0, 0, 0)

    if (expDate <= today) {
      throw new ValidationError('No se pueden recibir productos vencidos ni que venzan hoy.')
    }
  }
}
