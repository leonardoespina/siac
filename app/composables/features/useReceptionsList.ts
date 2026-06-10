import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'

export function useReceptionsList() {
  const router = useRouter()
  const $q = useQuasar()

  const receptions = ref([])
  const loading = ref(false)

  const columns = [
    { name: 'id', label: 'Nº Operación', field: 'id', align: 'left' },
    { name: 'supplier', label: 'Proveedor', field: (row: any) => row.supplier?.name || 'N/A', align: 'left' },
    { name: 'destination', label: 'Almacén Destino', field: (row: any) => row.destination?.name || 'N/A', align: 'left' },
    { name: 'status', label: 'Estado', field: 'status', align: 'center' },
    { name: 'date', label: 'Fecha', field: 'createdAt', align: 'right', format: (val: string) => new Date(val).toLocaleDateString() },
    { name: 'actions', label: 'Acciones', align: 'right' }
  ]

  const fetchReceptions = async () => {
    loading.value = true
    try {
      receptions.value = await $fetch('/api/receptions')
    } catch (error) {
      $q.notify({ type: 'negative', message: 'Error al cargar recepciones' })
    } finally {
      loading.value = false
    }
  }

  const viewDetails = (id: number) => {
    router.push(`/inventory/receptions/${id}`)
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'grey-7',
      PENDING: 'orange-8',
      APPROVED: 'blue-8',
      REJECTED: 'red-8',
      CONFIRMED: 'green-8'
    }
    return colors[status] || 'grey'
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      DRAFT: 'Borrador',
      PENDING: 'Pendiente',
      APPROVED: 'Aprobado',
      REJECTED: 'Rechazado',
      CONFIRMED: 'Confirmado'
    }
    return labels[status] || status
  }

  onMounted(() => {
    fetchReceptions()
  })

  return {
    receptions,
    loading,
    columns,
    viewDetails,
    getStatusColor,
    getStatusLabel
  }
}
