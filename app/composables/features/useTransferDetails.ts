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
  const transferItems = ref<any[]>([])

  const canApprove = computed(() => {
    if (!transfer.value) return false

    // 1. Despachos desde CENTRAL: Solo aprueban usuarios con permisos Globales o de Aprobación
    if (transfer.value.source?.type === 'CENTRAL') {
      return auth.hasPermission('APPROVAL_TRANSFERS', 'canUpdate') || auth.hasPermission('GLOBAL_ACCESS', 'canRead')
    }
    
    // 2. Despachos LOCALES (Comedor a Cocina): Autonomía Local
    if (transfer.value.source?.type === 'LOCAL') {
      // a. Si el usuario logueado creó este documento, puede aprobarlo (incluye a Gerentes actuando como operadores)
      if (transfer.value.createdBy?.id === auth.user?.id || transfer.value.createdById === auth.user?.id) return true
      
      // b. Si el usuario pertenece a este almacén local origen, puede aprobarlo
      if (transfer.value.sourceId === auth.user?.warehouseId) return true
      
      // c. Si es un Gerente que no creó el documento y no pertenece al almacén, NO puede meterse.
      return false
    }
    
    return false
  })
  
  const canEdit = computed(() => {
    if (!transfer.value) return false
    if (transfer.value.status === 'DRAFT') return true
    if (transfer.value.status === 'PENDING' && canApprove.value) return true
    return false
  })

  const canConfirmReception = computed(() => {
    if (!transfer.value) return false
    
    // Si el destino es un comedor (LOCAL), no se confirma aquí, se confirma en el módulo de cocina
    if (transfer.value.destination?.type === 'LOCAL') return false
    
    // Si el destino es CENTRAL (o cualquier otro), confirmamos que sea el destinatario o un gerente global
    if (auth.hasPermission('GLOBAL_ACCESS', 'canRead')) return true
    if (transfer.value.destinationId === auth.user?.warehouseId) return true
    
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
    fetchDetails() // Restore original values
  }

  const addProductRow = () => {
    transferItems.value.push({
      isNew: true,
      productId: null,
      productName: '',
      productCode: '',
      unit: '',
      availableStock: 0,
      quantity: 1,
      unitPrice: 0,
      selectedProduct: null
    })
  }

  const removeItem = (index: number) => {
    transferItems.value.splice(index, 1)
  }

  const saveChanges = async () => {
    const validItems = transferItems.value.filter(i => i.productId !== null)
    if (validItems.length === 0) return $q.notify({ type: 'negative', message: 'La transferencia no puede estar vacía' })
    
    // Validar Cantidades vs Stock
    for (const item of validItems) {
      if (item.quantity <= 0) return $q.notify({ type: 'negative', message: `La cantidad de ${item.productName} debe ser mayor a 0` })
      if (item.quantity > item.availableStock) {
        return $q.notify({ type: 'negative', message: `Stock insuficiente. Solo hay ${item.availableStock} ${item.unit} de ${item.productName} en Central` })
      }
    }

    saving.value = true
    try {
      await $fetch(`/api/transfers/${id}`, {
        method: 'PUT',
        body: { details: validItems }
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

  const { $socket } = useNuxtApp() as any

  onMounted(async () => {
    if (warehousesStore.warehouses.length === 0) await warehousesStore.fetchAll()
    if (productsStore.products.length === 0) await productsStore.fetchAll()
    fetchDetails()

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
    transfer, loading, saving, showPrices, isEditing, transferItems,
    canApprove, canEdit, canConfirmReception, columns, getCentralStock,
    updateStatus, promptReject, deleteDraft, enableEdit, cancelEdit, addProductRow, removeItem, saveChanges,
    getStatusColor, getStatusLabel 
  }
}
