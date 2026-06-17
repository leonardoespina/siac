import { ref, onMounted, computed, watch } from 'vue'
import { useWarehousesStore } from '~/stores/warehouses'
import { date } from 'quasar'

export function useShiftsReport() {
  const warehousesStore = useWarehousesStore()
  
  const loading = ref(true)
  const shifts = ref<any[]>([])
  
  // Filtros
  const today = new Date()
  const filterDate = ref(date.formatDate(today, 'YYYY-MM-DD'))
  const filterWarehouse = ref<number | null>(null) // null significa 'Todos'

  const fetchShifts = async () => {
    loading.value = true
    try {
      const query = new URLSearchParams()
      if (filterDate.value) query.append('date', filterDate.value)
      if (filterWarehouse.value) query.append('warehouseId', filterWarehouse.value.toString())
      
      shifts.value = await $fetch(`/api/shifts?${query.toString()}`)
    } catch (e) {
      console.error(e)
    } finally {
      loading.value = false
    }
  }

  // Refrescar cuando cambian los filtros
  watch([filterDate, filterWarehouse], () => {
    fetchShifts()
  })

  // Estadísticas rápidas del día
  const stats = computed(() => {
    let totalConsumptions = 0
    let totalLosses = 0
    let openShifts = 0
    let closedShifts = 0

    shifts.value.forEach(shift => {
      if (shift.status === 'OPEN') openShifts++
      if (shift.status === 'CLOSED') closedShifts++
      
      shift.transactions?.forEach((tx: any) => {
        if (tx.type === 'CONSUMPTION') {
          totalConsumptions += tx.details?.length || 0
        } else if (tx.type === 'LOSS') {
          totalLosses += tx.details?.length || 0
        }
      })
    })

    return { totalConsumptions, totalLosses, openShifts, closedShifts }
  })

  const columns = [
    { name: 'expand', label: '', field: 'expand', align: 'left' as const },
    { name: 'warehouse', label: 'Comedor', field: (row: any) => row.warehouse?.name, align: 'left' as const, sortable: true },
    { name: 'operator', label: 'Operador', field: (row: any) => row.user?.name, align: 'left' as const, sortable: true },
    { name: 'startTime', label: 'Apertura', field: 'startTime', align: 'left' as const, format: (val: string) => new Date(val).toLocaleTimeString(), sortable: true },
    { name: 'endTime', label: 'Cierre', field: 'endTime', align: 'left' as const, format: (val: string) => val ? new Date(val).toLocaleTimeString() : '-', sortable: true },
    { name: 'shiftType', label: 'Tipo', field: 'shiftType', align: 'center' as const, sortable: true },
    { name: 'status', label: 'Estado', field: 'status', align: 'center' as const, sortable: true }
  ]

  const pagination = ref({
    sortBy: 'startTime',
    descending: true,
    page: 1,
    rowsPerPage: 10
  })

  onMounted(async () => {
    if (warehousesStore.warehouses.length === 0) await warehousesStore.fetchAll()
    await fetchShifts()
  })

  return {
    loading, shifts, filterDate, filterWarehouse, warehousesStore, stats, fetchShifts,
    columns, pagination
  }
}
