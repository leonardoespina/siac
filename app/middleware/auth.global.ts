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

  // --- PROTECCIÓN BASADA EN PERMISOS (MATRIZ CRUD) ---
  if (auth.isAuthenticated && to.path !== '/') {
    // Diccionario de prefijo de ruta -> Código de Módulo
    const routePermissions: Record<string, string> = {
      '/inventory/receptions': 'RECEPTIONS',
      '/inventory/transfers': 'TRANSFERS',
      '/inventory/products': 'PRODUCTS',
      '/inventory/categories': 'CATEGORIES',
      '/inventory/units': 'UNITS',
      '/inventory/warehouses': 'WAREHOUSES',
      '/inventory/institutions': 'INSTITUTIONS',
      '/security': 'SECURITY',
      '/kitchen/operation': 'OPERATIONS',
      '/inventory/approvals': 'OPERATIONS',
      '/kitchen/shifts': 'OPERATIONS',
      '/reports/shifts': 'REPORTS'
    }

    // Buscamos si la ruta actual requiere algún módulo
    for (const [pathPrefix, moduleCode] of Object.entries(routePermissions)) {
      if (to.path.startsWith(pathPrefix)) {
        // Verificamos si tiene el permiso "canRead" para este módulo (o canUpdate para approvals)
        const requiredAction = pathPrefix === '/kitchen/approvals' ? 'canUpdate' : 'canRead'
        
        if (!auth.hasPermission(moduleCode, requiredAction)) {
          console.warn(`Acceso denegado a ${to.path}. Faltan permisos para el módulo ${moduleCode}.`)
          // Lo expulsamos al Dashboard
          return navigateTo('/')
        }
        break // Si ya validó, salimos del ciclo
      }
    }
  }
})
