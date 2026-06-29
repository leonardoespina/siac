import { defineStore } from 'pinia'
import { ref, readonly } from 'vue'
import { useAuthStore } from './auth'

export const useDashboardStore = defineStore('dashboard', () => {
  const pendingTasks = ref<any[]>([])
  const activeShift = ref<any>(null)
  const loading = ref(false)

  // Fetch Tareas Pendientes para el ADMIN (Recepciones y Transferencias)
  async function fetchPendingTasks() {
    loading.value = true
    try {
      // Obtenemos recepciones y transferencias (simplificado para el mockup visual por ahora)
      const [receptions, transfers, consumptions] = await Promise.all([
        $fetch('/api/receptions'),
        $fetch('/api/transfers'),
        $fetch('/api/consumptions')
      ])

      const tasks: any[] = []
      const auth = useAuthStore()
      const canApproveReceptions = auth.hasPermission('APPROVAL_RECEPTIONS', 'canUpdate')
      const canApproveTransfers = auth.hasPermission('APPROVAL_TRANSFERS', 'canUpdate')
      const canApproveOperations = auth.hasPermission('OPERATIONS', 'canUpdate')

      receptions.forEach((r: any) => {
        if (r.status === 'PENDING' && canApproveReceptions) {
          tasks.push({
            id: `R-${r.id}`,
            type: 'Recepción',
            icon: 'local_shipping',
            color: 'blue',
            route: `/inventory/receptions/${r.id}`,
            description: `${r.supplier?.name || 'Proveedor'} -> ${r.destination?.name || 'Central'}`,
            user: r.createdBy?.name || 'Desconocido'
          })
        }
      })

      transfers.forEach((t: any) => {
        if (t.status === 'PENDING' && canApproveTransfers) {
          tasks.push({
            id: `T-${t.id}`,
            type: 'Transferencia',
            icon: 'sync_alt',
            color: 'purple',
            route: `/inventory/transfers/${t.id}`,
            description: `${t.source?.name || 'Central'} -> ${t.destination?.name || 'Destino'}`,
            user: t.createdBy?.name || 'Desconocido'
          })
        }
      })

      consumptions.forEach((c: any) => {
        if (c.status === 'PENDING' && canApproveOperations) {
          tasks.push({
            id: `C-${c.id}`,
            type: 'Consumo / Operación',
            icon: 'restaurant',
            color: 'orange',
            route: `/inventory/approvals`, 
            description: `Despacho de: ${c.source?.name || 'Comedor'}`,
            user: c.createdBy?.name || 'Desconocido'
          })
        }
      })

      pendingTasks.value = tasks
    } catch (e) {
      console.error('Error fetching tasks', e)
    } finally {
      loading.value = false
    }
  }

  // Fetch Turno Activo para Operador Local
  async function fetchActiveShift() {
    loading.value = true
    try {
      const data = await $fetch('/api/shifts/active')
      activeShift.value = data || null
    } catch (e) {
      console.error('Error fetching shift', e)
      activeShift.value = null
    } finally {
      loading.value = false
    }
  }

  // Abrir Turno (Operador Local)
  async function openShift(shiftType: 'DIURNO' | 'NOCTURNO') {
    loading.value = true
    try {
      const data = await $fetch('/api/shifts/open', {
        method: 'POST',
        body: { shiftType, notes: 'Apertura desde Dashboard' }
      })
      activeShift.value = data
      return data
    } finally {
      loading.value = false
    }
  }

  function $reset() {
    pendingTasks.value = []
    activeShift.value = null
    loading.value = false
  }

  return {
    pendingTasks: readonly(pendingTasks),
    activeShift: readonly(activeShift),
    loading: readonly(loading),
    fetchPendingTasks,
    fetchActiveShift,
    openShift,
    $reset
  }
})
