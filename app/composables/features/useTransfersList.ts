import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'

export function useTransfersList() {
  const $q = useQuasar()
  const transfers = ref<any[]>([])
  const loading = ref(true)

  const columns = [
    { name: 'id', label: 'Transferencia Nº', field: 'id', align: 'left' as const, sortable: true },
    { name: 'date', label: 'Fecha', field: 'createdAt', align: 'left' as const, sortable: true, format: (val: string) => new Date(val).toLocaleDateString() },
    { name: 'destination', label: 'Cocina (Destino)', field: (row: any) => row.destination?.name, align: 'left' as const, sortable: true },
    { name: 'status', label: 'Estado', field: 'status', align: 'center' as const, sortable: true },
    { name: 'actions', label: '', field: 'actions', align: 'right' as const }
  ]

  const fetchTransfers = async () => {
    loading.value = true
    try {
      const data = await $fetch('/api/transfers')
      transfers.value = data as any[]
    } catch (e) {
      $q.notify({ type: 'negative', message: 'Error al cargar el historial de transferencias' })
    } finally {
      loading.value = false
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = { DRAFT: 'grey-7', PENDING: 'orange-8', APPROVED: 'blue-8', REJECTED: 'red-8', CONFIRMED: 'green-8' }
    return colors[status] || 'grey'
  }
  
  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = { DRAFT: 'Borrador', PENDING: 'Pendiente de Envío', APPROVED: 'En Tránsito', REJECTED: 'Rechazada', CONFIRMED: 'Recibida en Cocina' }
    return labels[status] || status
  }

  onMounted(() => fetchTransfers())

  return { transfers, loading, columns, fetchTransfers, getStatusColor, getStatusLabel }
}
