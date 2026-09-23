import { defineApiHandler } from '../../utils/handler'

export default defineApiHandler(async (event) => {
  const isHttps = getRequestProtocol(event) === 'https'

  // Limpiamos la cookie seteándola en la raíz '/' con expiración pasada
  deleteCookie(event, 'auth_token', {
    httpOnly: true,
    path: '/',
    secure: isHttps,
    sameSite: 'lax'
  })

  return { message: 'Sesión cerrada exitosamente' }
})

