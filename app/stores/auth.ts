import { defineStore } from 'pinia'

// Tipos para que TypeScript sepa qué forma tiene nuestro Usuario en el frontend
export interface ModulePermission {
  module: { code: string; name: string }
  canCreate: boolean
  canRead: boolean
  canUpdate: boolean
  canDelete: boolean
}

export interface UserState {
  id: number
  cedula: string
  name: string
  warehouseId?: number | null
  diningRoomId?: number | null
  subdependencyId?: number | null
  subdependency?: {
    name: string
    dependencyId: number
    dependency: { name: string }
  } | null
  role: {
    name: string
    permissions: ModulePermission[]
  }
}

export const useAuthStore = defineStore('auth', () => {
  // El token lo guardamos usando useCookie() nativo de Nuxt.
  // Esto es mejor que localStorage porque persiste mejor, es más seguro y
  // el SSR de Nuxt lo entiende automáticamente.
  const token = useCookie<string | null>('auth_token', { 
    default: () => null,
    watch: true, // Se actualiza reactivamente
    maxAge: 60 * 60 * 24 // 24 horas de vida
  })
  
  // Variable reactiva para guardar los datos del usuario logueado
  const user = ref<UserState | null>(null)

  // Computed property para saber rápido si alguien está logueado
  const isAuthenticated = computed(() => !!token.value && !!user.value)

  // Método: Iniciar Sesión (guarda la data que nos devuelve el backend)
  function setAuth(newToken: string, userData: UserState) {
    token.value = newToken
    user.value = userData
  }

  // Método: Cerrar Sesión (Borra todo y expulsa)
  function logout() {
    token.value = null
    user.value = null
    navigateTo('/login') // Redirige a la pantalla de login
  }

  // Método: Iniciar Sesión desde API
  async function login(cedula: string, password: string) {
    const response = await $fetch('/api/auth/login', {
      method: 'POST',
      body: { cedula, password }
    })
    setAuth(response.token, response.user)
  }

  // Método: Hidratar estado del usuario (cuando se recarga la página)
  async function fetchUser() {
    if (!token.value) return false
    try {
      // Intentamos recuperar la información del usuario usando el token (cookie)
      const data = await $fetch('/api/auth/me')
      user.value = data.user
      return true
    } catch (error) {
      // Si el token expiró o es inválido, cerramos sesión
      token.value = null
      user.value = null
      return false
    }
  }

  // Helper interno: Extrae la matriz CRUD de un solo módulo
  function getModulePermissions(moduleCode: string) {
    if (!user.value?.role?.permissions) return null
    return user.value.role.permissions.find(p => p.module.code === moduleCode) || null
  }

  // Helper rápido para verificar un permiso específico
  function hasPermission(moduleCode: string, action: 'canRead' | 'canCreate' | 'canUpdate' | 'canDelete') {
    // Si tiene el permiso GLOBAL_ACCESS y está activo, funciona como un SuperAdmin
    const hasGlobalAccess = getModulePermissions('GLOBAL_ACCESS')
    if (hasGlobalAccess && hasGlobalAccess.canRead) return true 

    const p = getModulePermissions(moduleCode)
    return p ? p[action] : false
  }

  // Método: Cambiar contraseña personal
  async function changePassword(oldPassword: string, newPassword: string) {
    await $fetch('/api/auth/password', {
      method: 'PUT',
      body: { oldPassword, newPassword }
    })
  }

  return {
    token,
    user,
    isAuthenticated,
    login,
    setAuth,
    logout,
    fetchUser,
    getModulePermissions,
    hasPermission,
    changePassword
  }
})
