import mitt from 'mitt'

/**
 * Catálogo Central de Eventos de Dominio (AppEvents)
 * Aquí se definen todos los eventos que pueden ocurrir en el sistema y el tipo de dato exacto (payload) que envían.
 */
export type AppEvents = {
  // Recepciones
  'reception:created': { id: number, destinationId: number }
  'reception:status_changed': { id: number, status: string, userId: number }
  
  // Transferencias
  'transfer:created': { id: number, sourceId: number, destinationId: number }
  'transfer:status_changed': { id: number, status: string, userId: number }
  
  // Inventario / Alertas
  'stock:below-minimum': { warehouseId: number, productId: number, currentQuantity: number, minimumQuantity: number }
}

// Singleton in-memory bus
export const eventBus = mitt<AppEvents>()

/**
 * Función Helper para emitir eventos fuertemente tipados
 */
export function emitEvent<K extends keyof AppEvents>(event: K, payload: AppEvents[K]) {
  // Emitimos internamente para que los listeners (ej. WebSockets, Logs) reaccionen
  eventBus.emit(event, payload)
  console.log(`[EventBus] Emitted: ${event}`, payload)
}
