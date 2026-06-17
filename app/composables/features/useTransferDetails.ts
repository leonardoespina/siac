import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '~/stores/auth'
import { useWarehousesStore } from '~/stores/warehouses'
import { useProductsStore } from '~/stores/products'

export function useTransferDetails() {
  const route = useRoute()
  const router = useRouter()
  const $q = useQuasar()
  const auth = useAuthStore()
  
  const warehousesStore = useWarehousesStore()
  const productsStore = useProductsStore()

  const id = route.params.id
  const transfer = ref<any>(null)
  const loading = ref(true)
  const saving = ref(false)
  
  // Opciones de visualización
  const showPrices = ref(false)
  
  // Opciones de Edición
  const isEditing = ref(false)
  const searchQuery = ref('')
  const transferItems = ref<any[]>([])

  const canApprove = computed(() => auth.user?.role?.name === 'ADMIN' || auth.user?.role?.name === 'GERENTE')
  
  const canEdit = computed(() => {
    if (!transfer.value) return false
    if (transfer.value.status === 'DRAFT') return true
    if (transfer.value.status === 'PENDING' && canApprove.value) return true
    return false
  })

  // Helper para obtener stock del almacén central
  const getCentralStock = (productId: number) => {
    const central = warehousesStore.warehouses.find(w => w.type === 'CENTRAL')
    if (!central) return 0
    const product = productsStore.products.find(p => p.id === productId)
    if (!product || !product.stocks) return 0
    const stock = product.stocks.find((s: any) => s.warehouseId === central.id)
    return stock ? Number(stock.quantity) : 0
  }

  // Buscador de productos para el modo edición
  const filteredProducts = computed(() => {
    if (!searchQuery.value) return []
    const lowerQuery = searchQuery.value.toLowerCase()
    return productsStore.products.filter(p => 
      p.active && (p.name.toLowerCase().includes(lowerQuery) || p.code.toLowerCase().includes(lowerQuery))
    ).slice(0, 8)
  })

  const columns = computed(() => {
    const cols = [
      { name: 'code', label: 'Código', field: (row: any) => row.productCode, align: 'left' as const },
      { name: 'product', label: 'Producto', field: (row: any) => row.productName, align: 'left' as const },
      { name: 'quantity', label: 'Cantidad Enviada', field: 'quantity', align: 'center' as const, classes: 'text-weight-bold text-primary' },
      { name: 'unit', label: 'Medida', field: (row: any) => row.unit, align: 'center' as const }
    ]
    if (showPrices.value) {
      cols.push({ name: 'price', label: 'Precio', field: 'unitPrice', align: 'right' as const, format: (val: number) => `$${val}` })
    }
    if (isEditing.value) {
      cols.push({ name: 'actions', label: '', field: 'actions', align: 'right' as const })
    }
    return cols
  })

  const fetchDetails = async () => {
    try {
      const data = await $fetch(`/api/transfers/${id}`)
      transfer.value = data
      
      // Mapear los detalles al formato editable transferItems
      transferItems.value = data.details.map((d: any) => ({
        productId: d.productId,
        productName: d.product.name,
        productCode: d.product.code,
        unit: d.product.unit?.abbreviation || 'UN',
        availableStock: getCentralStock(d.productId),
        quantity: d.quantity,
        unitPrice: d.unitPrice
      }))
      
    } catch (e) {
      $q.notify({ type: 'negative', message: 'Error al cargar detalle' })
    } finally {
      loading.value = false
    }
  }

  const updateStatus = async (status: string, notes?: string) => {
    let message = '¿Estás seguro de avanzar la transacción?'
    if (status === 'PENDING') message = '¿Solicitar aprobación gerencial para el envío?'
    if (status === 'APPROVED') message = '¿Aprobar envío y poner En Tránsito?'
    if (status === 'CONFIRMED') message = '¿Confirmar recepción en la Cocina? Esto sumará el stock al Almacén Local.'
    
    $q.dialog({ title: 'Confirmar Acción', message, cancel: true }).onOk(async () => {
      saving.value = true
      try {
        await $fetch(`/api/transfers/${id}/status`, { method: 'PUT', body: { status, notes } })
        $q.notify({ type: 'positive', message: 'Estado actualizado correctamente' })
        await fetchDetails()
      } catch (e: any) {
        $q.notify({ type: 'negative', message: e.data?.message || 'Error al actualizar estado' })
      } finally {
        saving.value = false
      }
    })
  }

  const promptReject = () => {
    $q.dialog({
      title: 'Rechazar Transferencia',
      message: 'Indica el motivo del rechazo:',
      prompt: { model: '', type: 'text' },
      cancel: true
    }).onOk((notes) => {
      updateStatus('REJECTED', notes)
    })
  }

  const deleteDraft = () => {
    $q.dialog({ title: 'Eliminar Borrador', message: '¿Borrar esta transferencia?', color: 'negative', cancel: true }).onOk(async () => {
      saving.value = true
      try {
        await $fetch(`/api/transfers/${id}`, { method: 'DELETE' })
        router.push('/inventory/transfers')
      } catch(e) {}
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
      availableStock: getCentralStock(product.id),
      quantity: 1,
      unitPrice: 0
    })
    searchQuery.value = ''
  }

  const removeItem = (index: number) => {
    transferItems.value.splice(index, 1)
  }

  const saveChanges = async () => {
    if (transferItems.value.length === 0) return $q.notify({ type: 'negative', message: 'La transferencia no puede estar vacía' })
    
    // Validar Cantidades vs Stock
    for (const item of transferItems.value) {
      if (item.quantity <= 0) return $q.notify({ type: 'negative', message: `La cantidad de ${item.productName} debe ser mayor a 0` })
      if (item.quantity > item.availableStock) {
        return $q.notify({ type: 'negative', message: `Stock insuficiente. Solo hay ${item.availableStock} ${item.unit} de ${item.productName} en Central` })
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
    const labels: Record<string, string> = { DRAFT: 'Borrador', PENDING: 'Pendiente Aprobación', APPROVED: 'En Tránsito', REJECTED: 'Rechazada', CONFIRMED: 'Recibida en Cocina' }
    return labels[status] || status
  }

  onMounted(async () => {
    if (warehousesStore.warehouses.length === 0) await warehousesStore.fetchAll()
    if (productsStore.products.length === 0) await productsStore.fetchAll()
    fetchDetails()
  })

  return { 
    transfer, loading, saving, showPrices, isEditing, searchQuery, transferItems, filteredProducts,
    canApprove, canEdit, columns, getCentralStock,
    updateStatus, promptReject, deleteDraft, enableEdit, cancelEdit, addItem, removeItem, saveChanges,
    getStatusColor, getStatusLabel 
  }
}
