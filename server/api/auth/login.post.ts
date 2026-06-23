import { defineApiHandler } from '../../utils/handler'
import { prisma } from '../../utils/prisma'
import { signToken } from '../../utils/jwt'
import { logAudit } from '../../utils/audit'
import { UnauthorizedError, NotFoundError, ValidationError } from '../../domain/errors'
import bcrypt from 'bcryptjs'

export default defineApiHandler(async (event) => {
  // 1. Leer el cuerpo de la petición (lo que envía el frontend)
  const body = await readBody(event)
  const cedula = body.cedula?.trim()
  const password = body.password

  if (!cedula || !password) {
    throw new ValidationError('Cédula y contraseña son requeridas')
  }

  // 2. Buscar al usuario por cédula, incluyendo su Rol y Permisos
  const user = await prisma.user.findUnique({
    where: { cedula },
    include: {
      role: {
        include: {
          permissions: {
            include: { module: true }
          }
        }
      },
      subdependency: {
        select: {
          name: true,
          dependencyId: true,
          dependency: { select: { name: true } }
        }
      }
    }
  })

  if (!user || !user.active) {
    throw new NotFoundError('Usuario', cedula)
  }

  // 3. Verificar contraseña real usando bcryptjs
  const isValid = await bcrypt.compare(password, user.passwordHash)
  if (!isValid) {
    throw new UnauthorizedError('Cédula o contraseña incorrecta')
  }

  // 4. Generar Token JWT
  const token = signToken({ userId: user.id }, '24h')

  // 5. REGISTRAR AUDITORÍA 🔥
  await logAudit(user.id, 'LOGIN', 'AUTH', user.id, 'Inicio de sesión desde la web')

  // 6. Devolver la data al frontend
  const { passwordHash, ...safeUser } = user

  return {
    token,
    user: safeUser
  }
})
