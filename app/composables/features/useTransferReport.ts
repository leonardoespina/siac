import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useQuasar } from 'quasar'

export interface TransferDetail {
  id: number
  productId: number
  quantity: number
  unitPrice: number
  product?: {
    code: string
    name: string
    unit?: {
      abbreviation: string
    }
  }
}

export interface TransferTransaction {
  id: number
  createdAt: string
  status: string
  referenceNumber?: string
  notes?: string
  source?: {
    name: string
  }
  destination?: {
    name: string
  }
  createdBy?: {
    name: string
  }
  approvedBy?: {
    name: string
  }
  details: TransferDetail[]
}

export function useTransferReport() {
  const route = useRoute()
  const $q = useQuasar()

  const id = route.params.id as string
  const transaction = ref<TransferTransaction | null>(null)
  const loading = ref(true)

  const fetchDetails = async () => {
    loading.value = true
    try {
      const data = await $fetch<TransferTransaction>(`/api/transfers/${id}`)
      transaction.value = data
    } catch (error) {
      $q.notify({ 
        type: 'negative', 
        message: 'No se pudo cargar la transferencia para el acta' 
      })
    } finally {
      loading.value = false
    }
  }

  const closeTab = () => {
    window.close()
  }

  const totalQuantity = computed(() => {
    if (!transaction.value?.details) return 0
    return transaction.value.details.reduce((acc, d) => acc + Number(d.quantity), 0)
  })

  onMounted(() => {
    fetchDetails()
  })

  return {
    transaction,
    loading,
    totalQuantity,
    closeTab
  }
}
