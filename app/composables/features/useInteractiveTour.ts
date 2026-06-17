import { ref, computed } from 'vue'
import { useAuthStore } from '~/stores/auth'

const isOpen = ref(false)
const currentSlide = ref('welcome')

export function useInteractiveTour() {
  const authStore = useAuthStore()

  // Detectamos el perfil del usuario activo (Gerente vs Operador)
  // En nuestro sistema, el Gerente tiene el rol 'ADMIN' o acceso al almacén 'CENTRAL'
  const isManager = computed(() => {
    return authStore.user?.role?.name === 'ADMIN' || authStore.warehouse?.type === 'CENTRAL'
  })

  // Funciones de control del modal
  function openTour() {
    currentSlide.value = 'welcome'
    isOpen.value = true
  }

  function closeTour() {
    isOpen.value = false
    markAsSeen()
  }

  // Lógica de Persistencia (localStorage)
  function getStorageKey() {
    if (!authStore.user) return null
    return `siac_tour_seen_${authStore.user.id}`
  }

  function hasSeenTour(): boolean {
    const key = getStorageKey()
    if (!key) return true // Si no hay usuario, no mostramos tour
    return localStorage.getItem(key) === 'true'
  }

  function markAsSeen() {
    const key = getStorageKey()
    if (key) {
      localStorage.setItem(key, 'true')
    }
  }

  function checkAndOpenTour() {
    // Si no lo ha visto, se abre automáticamente
    if (!hasSeenTour()) {
      openTour()
    }
  }

  return {
    isOpen,
    currentSlide,
    isManager,
    openTour,
    closeTour,
    checkAndOpenTour,
    hasSeenTour
  }
}
