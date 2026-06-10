import { DomainError } from '../domain/errors'
import type { EventHandler } from 'h3'

// ── WRAPPER DE API HANDLERS ─────────────────────────────────────────────────
// Cumple con la regla de la Arquitectura Híbrida:
// Los endpoints en server/api/ NUNCA deben usar bloques try/catch manuales.
// En su lugar, se envuelven con `defineApiHandler`.
// 
// Si la capa Service o Domain lanza un error de negocio (DomainError), 
// este wrapper lo atrapa automáticamente y lo transforma en una respuesta 
// HTTP limpia (ej: 404, 400) para el frontend.

export function defineApiHandler(handler: EventHandler): EventHandler {
  return defineEventHandler(async (event) => {
    try {
      return await handler(event)
    } catch (error: any) {
      // Si el error viene de nuestras reglas de negocio (ej. NotFoundError)
      if (error instanceof DomainError) {
        throw createError({
          statusCode: error.statusCode,
          message: error.message,
          data: { code: error.code },
        })
      }
      
      // Si es un error inesperado (BD caída, sintaxis, etc), lanza 500
      throw error
    }
  })
}
