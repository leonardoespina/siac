import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '~/stores/auth'
import { useDashboardStore } from '~/stores/dashboard'
import { useProductsStore } from '~/stores/products'

export function useDashboard() {
  const $q = useQuasar()
  const router = useRouter()
  
  const auth = useAuthStore()
  const dashboardStore = useDashboardStore()
  const productStore = useProductsStore()

  // ── LÓGICA MODULAR (CAPABILITY-DRIVEN) ──
  // En lugar de encasillar al usuario en un solo rol, verificamos qué permisos tiene
  // y encendemos los widgets correspondientes en la pantalla.

  const canApprove = computed(() => {
    // Bandeja de Aprobaciones: Si puede aprobar algo
    return auth.hasPermission('APPROVAL_OPERATIONS', 'canUpdate') ||
           auth.hasPermission('APPROVAL_RECEPTIONS', 'canUpdate') ||
           auth.hasPermission('APPROVAL_TRANSFERS', 'canUpdate')
  })

  const canOperateLocal = computed(() => {
    // Control de Turno y Almacén Físico: Solo si puede Crear Operaciones Y tiene un almacén asignado
    return !!auth.user?.warehouseId && auth.hasPermission('OPERATIONS', 'canCreate')
  })

  const canManageDiners = computed(() => {
    // Módulo de Comensales: Si puede leer el directorio de comensales o gestionar peticiones
    return auth.hasPermission('DINERS', 'canRead') || auth.hasPermission('DINERS_REQUESTS', 'canRead')
  })

  // Atajos (Ejemplo: Transferencias, Reportes)
  const canViewReports = computed(() => auth.hasPermission('REPORTS', 'canRead'))
  const canManageProducts = computed(() => auth.hasPermission('PRODUCTS', 'canRead'))
  const canManageTransfers = computed(() => auth.hasPermission('TRANSFERS', 'canCreate'))

  const isOperator = computed(() => canOperateLocal.value)

  const warehouseName = computed(() => {
    // En el futuro, podríamos cruzar auth.user.warehouseId con el nombre real
    return 'Sede Local' 
  })

  // ── LÓGICA DEL OPERADOR LOCAL ──
  const isShiftOpen = computed(() => !!dashboardStore.activeShift)

  // Obtener el inventario local filtrando por el warehouseId del usuario
  const localInventory = computed(() => {
    if (!auth.user?.warehouseId) return []
    
    return productStore.products.map(p => {
      // Buscamos el stock de este producto en el almacén del usuario
      const stockObj = p.stocks?.find((s: any) => s.warehouseId === auth.user?.warehouseId)
      const quantity = stockObj ? Number(stockObj.quantity) : 0
      return {
        ...p,
        localQuantity: quantity
      }
    }).filter(p => p.localQuantity > 0) // Solo mostrar los que tienen stock local
  })

  const handleOpenShift = () => {
    $q.dialog({
      title: 'Abrir Turno',
      message: '¿Estás seguro de iniciar el turno de operaciones?',
      options: {
        type: 'radio',
        model: 'DESAYUNO',
        items: [
          { label: 'Desayuno', value: 'DESAYUNO' },
          { label: 'Almuerzo', value: 'ALMUERZO' },
          { label: 'Cena', value: 'CENA' },
          { label: 'Sobrecena', value: 'SOBRECENA' }
        ]
      },
      cancel: true,
      persistent: true
    }).onOk(async (shiftType) => {
      try {
        await dashboardStore.openShift(shiftType)
        $q.notify({ type: 'positive', message: `Turno ${shiftType} abierto con éxito.` })
      } catch (error: any) {
        $q.notify({ type: 'negative', message: error.data?.message || 'Error al abrir turno' })
      }
    })
  }

  const goTo = (route: string) => {
    if (isOperator.value && !isShiftOpen.value && route.includes('new')) {
      $q.notify({ type: 'warning', message: 'Debes abrir el turno primero para registrar movimientos.' })
      return
    }
    router.push(route)
  }

  const initializeDashboard = async () => {
    const promises: Promise<any>[] = []
    
    // Disparamos en paralelo solo las consultas de los widgets que el usuario tiene activos
    if (canApprove.value) {
      promises.push(dashboardStore.fetchPendingTasks())
    }
    
    if (canOperateLocal.value) {
      promises.push(dashboardStore.fetchActiveShift())
      promises.push(productStore.fetchAll()) // Fetch productos (para ver stock local)
    }

    // (Futuro) Si canManageDiners, podríamos hacer fetch de sus métricas de comensales aquí

    await Promise.all(promises)
  }

  onMounted(() => {
    initializeDashboard()
  })

  return {
    auth,
    dashboardStore,
    showAdminDashboard: canApprove, // Mantener para compatibilidad rápida con index.vue (opcional, mejor renombrar luego)
    canApprove,
    canOperateLocal,
    canManageDiners,
    canViewReports,
    canManageProducts,
    canManageTransfers,
    warehouseName,
    isShiftOpen,
    localInventory,
    handleOpenShift,
    goTo
  }
}
