import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '~/stores/auth'
import { useProductsStore } from '~/stores/products'

export function useConsumptionDetails() {
  const route = useRoute()
  const router = useRouter()
  const $q = useQuasar()
  const auth = useAuthStore()
  
  const productsStore = useProductsStore()

  const id = route.params.id
  const transfer = ref<any>(null)
  const loading = ref(true)
  const saving = ref(false)
  
  // Opciones de Edición
  const isEditing = ref(false)
  const searchQuery = ref('')
  const transferItems = ref<any[]>([])

  const canEdit = computed(() => {
    if (!transfer.value) return false
    if (transfer.value.status === 'PENDING' || transfer.value.status === 'DRAFT') return true
    return false
  })

  // Helper para obtener stock local
  const getLocalStock = (productId: number) => {
    if (!transfer.value || !transfer.value.sourceId) return 0
    const product = productsStore.products.find(p => p.id === productId)
    if (!product || !product.stocks) return 0
    const stock = product.stocks.find((s: any) => s.warehouseId === transfer.value.sourceId)
    return stock ? Number(stock.quantity) : 0
  }

  // Buscador de productos para el modo edición
  const filteredProducts = computed(() => {
    if (!searchQuery.value) return []
    const lowerQuery = searchQuery.value.toLowerCase()
    return productsStore.products.filter(p => 
      p.active && (p.name.toLowerCase().includes(lowerQuery) || p.code.toLowerCase().includes(lowerQuery))
    ).map(p => ({ ...p, availableStock: getLocalStock(p.id) })).filter(p => p.availableStock > 0).slice(0, 8)
  })

  const columns = computed(() => {
    const cols = [
      { name: 'code', label: 'Código', field: (row: any) => row.productCode, align: 'left' as const },
      { name: 'product', label: 'Producto', field: (row: any) => row.productName, align: 'left' as const },
      { name: 'quantity', label: 'Cantidad', field: 'quantity', align: 'center' as const, classes: 'text-weight-bold text-primary' },
      { name: 'unit', label: 'Medida', field: (row: any) => row.unit, align: 'center' as const }
    ]
    if (isEditing.value) {
      cols.push({ name: 'actions', label: '', field: 'actions', align: 'right' as const })
    }
    return cols
  })

  const fetchDetails = async () => {
    try {
      const data = await $fetch(`/api/transfers/${id}`)
      transfer.value = data
      
      transferItems.value = data.details.map((d: any) => ({
        productId: d.productId,
        productName: d.product.name,
        productCode: d.product.code,
        unit: d.product.unit?.abbreviation || 'UN',
        availableStock: getLocalStock(d.productId),
        quantity: d.quantity,
        unitPrice: d.unitPrice
      }))
    } catch (e) {
      $q.notify({ type: 'negative', message: 'Error al cargar detalle' })
    } finally {
      loading.value = false
    }
  }

  const approveConsumption = async () => {
    $q.dialog({ title: 'Aprobar Registro', message: '¿Estás seguro de aprobar este registro? Esto descontará el stock inmediatamente.', cancel: true, color: 'positive' }).onOk(async () => {
      saving.value = true
      try {
        await $fetch(`/api/transfers/${id}/status`, {
          method: 'PUT',
          body: { status: 'CONFIRMED', notes: `Auto-aprobado por el usuario local` }
        })
        $q.notify({ type: 'positive', message: 'Registro aprobado y stock descontado' })
        await fetchDetails()
      } catch (e: any) {
        $q.notify({ type: 'negative', message: e.data?.message || 'Error al aprobar el registro' })
      } finally {
        saving.value = false
      }
    })
  }

  const deleteConsumption = () => {
    $q.dialog({ title: 'Eliminar Registro', message: '¿Borrar este consumo/merma?', color: 'negative', cancel: true }).onOk(async () => {
      saving.value = true
      try {
        await $fetch(`/api/transfers/${id}`, { method: 'DELETE' })
        router.push('/kitchen/operation')
      } catch(e) {
        $q.notify({ type: 'negative', message: 'Error al borrar' })
      } finally {
        saving.value = false
      }
    })
  }

  // ---- MÉTODOS DE EDICIÓN ----
  const enableEdit = () => {
    isEditing.value = true
  }

  const cancelEdit = () => {
    isEditing.value = false
    searchQuery.value = ''
    fetchDetails() // Restore original values
  }

  const addItem = (product: any) => {
    const existing = transferItems.value.find(i => i.productId === product.id)
    if (existing) {
      $q.notify({ type: 'warning', message: 'El producto ya está en la lista' })
      return
    }
    transferItems.value.push({
      productId: product.id,
      productName: product.name,
      productCode: product.code,
      unit: product.unit?.abbreviation || 'UN',
      availableStock: product.availableStock,
      quantity: 1,
      unitPrice: 0
    })
    searchQuery.value = ''
  }

  const removeItem = (index: number) => {
    transferItems.value.splice(index, 1)
  }

  const saveChanges = async () => {
    if (transferItems.value.length === 0) return $q.notify({ type: 'negative', message: 'La lista no puede estar vacía' })
    
    // Validar Cantidades vs Stock
    for (const item of transferItems.value) {
      if (item.quantity <= 0) return $q.notify({ type: 'negative', message: `La cantidad de ${item.productName} debe ser mayor a 0` })
      if (item.quantity > item.availableStock) {
        return $q.notify({ type: 'negative', message: `Stock local insuficiente para ${item.productName}` })
      }
    }

    saving.value = true
    try {
      await $fetch(`/api/transfers/${id}`, {
        method: 'PUT',
        body: { details: transferItems.value }
      })
      $q.notify({ type: 'positive', message: 'Cambios guardados exitosamente' })
      isEditing.value = false
      await fetchDetails()
    } catch (e: any) {
      $q.notify({ type: 'negative', message: e.data?.message || 'Error al guardar cambios' })
    } finally {
      saving.value = false
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = { DRAFT: 'grey-7', PENDING: 'orange-8', APPROVED: 'blue-8', REJECTED: 'red-8', CONFIRMED: 'green-8' }
    return colors[status] || 'grey'
  }
  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = { DRAFT: 'Borrador', PENDING: 'Pendiente', APPROVED: 'Aprobado', REJECTED: 'Rechazada', CONFIRMED: 'Aprobado' }
    return labels[status] || status
  }

  const { $socket } = useNuxtApp() as any

  onMounted(async () => {
    if (productsStore.products.length === 0) await productsStore.fetchAll()
    await fetchDetails()

    if ($socket) {
      $socket.on('transaction:sync', (payload: any) => {
        const tx = payload.transaction
        if (tx && Number(tx.id) === Number(id)) {
          transfer.value = tx
        }
      })
    }
  })

  return { 
    transfer, loading, saving, isEditing, searchQuery, transferItems, filteredProducts,
    canEdit, columns, getLocalStock,
    deleteConsumption, enableEdit, cancelEdit, addItem, removeItem, saveChanges, approveConsumption,
    getStatusColor, getStatusLabel 
  }
}
