import type { H3Event } from 'h3'
import { verifyToken } from './jwt'
import { UnauthorizedError, ForbiddenError } from '../domain/errors'
import { prisma } from './prisma'

// ── PROTECCIÓN DE RUTAS Y PERMISOS DINÁMICOS ──────────────────────────────
// Estas funciones se usarán en todos los endpoints (handlers) que requieran seguridad.

/**
 * 1. Verifica que el usuario haya enviado un token JWT válido.
 * Devuelve el ID del usuario si es exitoso. Lanza 401 si no.
 */
export async function requireAuth(event: H3Event) {
  // Intentamos leer el Header "Authorization: Bearer <token>"
  let token = getHeader(event, 'authorization')?.split(' ')[1]
  
  // Si no hay Header, intentamos leer la cookie nativa (usada por los $fetch de Nuxt)
  if (!token) {
    token = getCookie(event, 'auth_token')
  }
  
  if (!token) {
    throw new UnauthorizedError('Se requiere token de autenticación')
  }

  const decoded = verifyToken(token) as { userId: number }
  return decoded.userId
}

/**
 * 2. Verifica la matriz de permisos de la base de datos (Rol vs Módulo).
 * Ejemplo de uso en un endpoint: await requirePermission(event, 'PRODUCTS', 'create')
 */
export async function requirePermission(
  event: H3Event, 
  moduleCode: string, 
  action: 'create' | 'read' | 'update' | 'delete'
) {
  // Primero verificamos que esté logueado
  const userId = await requireAuth(event)
  
  // Buscamos al usuario en BD y traemos su matriz de permisos SOLO para el módulo solicitado
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        include: {
          permissions: {
            where: { module: { code: moduleCode } }
          }
        }
      }
    }
  })

  if (!user || !user.role) {
    throw new ForbiddenError('El usuario no tiene un rol asignado')
  }

  // (Opcional) Si tuviéramos un rol Super Admin, podríamos dejarlo pasar siempre:
  // if (user.role.name === 'ADMIN') return userId;

  const modulePerm = user.role.permissions[0]

  if (!modulePerm) {
    throw new ForbiddenError(`Tu rol no tiene permisos configurados para el módulo: ${moduleCode}`)
  }

  // Comparamos la acción solicitada con la bandera booleana en la Base de Datos
  const hasAccess = 
    (action === 'create' && modulePerm.canCreate) ||
    (action === 'read' && modulePerm.canRead) ||
    (action === 'update' && modulePerm.canUpdate) ||
    (action === 'delete' && modulePerm.canDelete)

  if (!hasAccess) {
    throw new ForbiddenError(`No tienes permiso para '${action}' en el módulo ${moduleCode}`)
  }

  return userId
}

/**
 * 3. Verifica que el usuario tenga el rol 'ADMIN'.
 * Devuelve el objeto del usuario (con su rol) si es exitoso.
 */
export async function requireAdmin(event: H3Event) {
  const userId = await requireAuth(event)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true }
  })
  
  if (user?.role?.name !== 'ADMIN') {
    throw new UnauthorizedError('Solo administradores pueden realizar esta acción')
  }
  
  return user
}
