import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuthStore()
  
  // Si tenemos token guardado pero el usuario es null (ej: recargó la página con F5)
  // intentamos recuperar la sesión antes de tomar decisiones.
  if (auth.token && !auth.user) {
    await auth.fetchUser()
  }

  // Si no está logueado y la página NO es el login, expúlsalo al login
  if (!auth.isAuthenticated && to.path !== '/login') {
    return navigateTo('/login')
  }

  // Si ya está logueado e intenta entrar a /login, mándalo al Dashboard
  if (auth.isAuthenticated && to.path === '/login') {
    return navigateTo('/')
  }
})
