import { ref, onMounted, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useAuthStore } from '~/stores/auth'
import { useWarehousesStore } from '~/stores/warehouses'
import { useProductsStore } from '~/stores/products'

export function useKitchenOperation() {
  const $q = useQuasar()
  const auth = useAuthStore()
  const warehousesStore = useWarehousesStore()
  const productsStore = useProductsStore()

  const loading = ref(true)
  const saving = ref(false)
  const incomingTransfers = ref<any[]>([])
  const activeShift = ref<any>(null)
  
  // Modales de Turno
  const isShiftDialogOpen = ref(false)
  const isCloseShiftDialogOpen = ref(false)
  const shiftForm = ref({ shiftType: 'DIURNO', customStartTime: '', useCustomTime: false })
  const closeShiftForm = ref({ customEndTime: '', useCustomTime: false })
  
  // Consumo Form
  const isConsumptionDialogVisible = ref(false)
  const consumptionType = ref<'CONSUMPTION' | 'LOSS' | 'SUPPORT'>('CONSUMPTION')
  const consumptionItems = ref<any[]>([])
  const searchQuery = ref('')
  const selectedInstitutionId = ref<number | null>(null)
  const institutions = ref<any[]>([])
  
  // Consumos del turno activo
  const shiftConsumptions = ref<any[]>([])

  const consumptionColumns = [
    { name: 'id', label: 'Nº', field: 'id', align: 'left' as const, sortable: true },
    { name: 'type', label: 'Tipo', field: 'type', align: 'left' as const },
    { name: 'date', label: 'Hora', field: 'createdAt', align: 'left' as const, format: (val: string) => new Date(val).toLocaleTimeString() },
    { name: 'status', label: 'Estado', field: 'status', align: 'center' as const },
    { name: 'actions', label: '', field: 'actions', align: 'right' as const }
  ]

  // Variables para el Modo Administrador
  const isGlobalUser = computed(() => !auth.user?.warehouseId)
  const activeWarehouseId = ref<number | null>(auth.user?.warehouseId || null)

  const hasAssignedWarehouse = computed(() => !!activeWarehouseId.value)
  
  const assignedWarehouseName = computed(() => {
    if (!activeWarehouseId.value) return 'Selecciona un comedor'
    const wh = warehousesStore.warehouses.find(w => w.id === activeWarehouseId.value)
    return wh?.name || 'Comedor'
  })

  // ---- 1. RECEPCIONES PENDIENTES ----
  const fetchIncomingTransfers = async () => {
    if (!activeWarehouseId.value) {
      incomingTransfers.value = []
      return
    }
    try {
      const allTransfers = await $fetch('/api/transfers') as any[]
      incomingTransfers.value = allTransfers.filter(t => 
        t.destinationId === activeWarehouseId.value && t.status === 'APPROVED'
      )
    } catch (e) {
      console.error(e)
    }
  }

  const confirmReception = async (transferId: number) => {
    $q.dialog({ title: 'Recibir Mercancía', message: '¿Confirmar que la mercancía llegó al comedor? Esto cargará el inventario a tu almacén.', cancel: true }).onOk(async () => {
      saving.value = true
      try {
        await $fetch(`/api/transfers/${transferId}/status`, { method: 'PUT', body: { status: 'CONFIRMED' } })
        $q.notify({ type: 'positive', message: 'Inventario actualizado correctamente' })
        await fetchIncomingTransfers()
      } catch (e: any) {
        $q.notify({ type: 'negative', message: e.data?.message || 'Error al recibir mercancía' })
      } finally {
        saving.value = false
      }
    })
  }

  // ---- 2. TURNOS ----
  const fetchActiveShift = async () => {
    if (!activeWarehouseId.value) {
      activeShift.value = null
      shiftConsumptions.value = []
      return
    }
    try {
      activeShift.value = await $fetch(`/api/shifts/active?warehouseId=${activeWarehouseId.value}`)
      await fetchShiftConsumptions()
    } catch (e) {
      console.error(e)
    }
  }

  const fetchShiftConsumptions = async () => {
    if (!activeShift.value || !activeWarehouseId.value) {
      shiftConsumptions.value = []
      return
    }
    try {
      const data = await $fetch(`/api/consumptions?warehouseId=${activeWarehouseId.value}`) as any[]
      // Filtrar solo los del turno actual
      shiftConsumptions.value = data.filter(c => c.shiftId === activeShift.value.id)
    } catch (e) {
      console.error(e)
    }
  }

  const openShiftDialog = () => {
    if (!activeWarehouseId.value) return $q.notify({ type: 'negative', message: 'Selecciona un comedor primero' })
    shiftForm.value = { shiftType: 'DIURNO', customStartTime: '', useCustomTime: false }
    isShiftDialogOpen.value = true
  }

  const submitOpenShift = async () => {
    saving.value = true
    try {
      const body: any = { warehouseId: activeWarehouseId.value, shiftType: shiftForm.value.shiftType }
      if (shiftForm.value.useCustomTime && shiftForm.value.customStartTime) {
        body.startTime = shiftForm.value.customStartTime
      }

      activeShift.value = await $fetch('/api/shifts/open', { 
        method: 'POST',
        body
      })
      isShiftDialogOpen.value = false
      $q.notify({ type: 'positive', message: 'Turno abierto exitosamente' })
    } catch (e: any) {
      $q.notify({ type: 'negative', message: e.data?.message || 'Error al abrir turno' })
    } finally {
      saving.value = false
    }
  }

  const openCloseShiftDialog = () => {
    closeShiftForm.value = { customEndTime: '', useCustomTime: false }
    isCloseShiftDialogOpen.value = true
  }

  const submitCloseShift = async () => {
    saving.value = true
    try {
      const body: any = {}
      if (closeShiftForm.value.useCustomTime && closeShiftForm.value.customEndTime) {
        body.endTime = closeShiftForm.value.customEndTime
      }

      await $fetch(`/api/shifts/${activeShift.value.id}/close`, { 
        method: 'POST',
        body 
      })
      activeShift.value = null
      shiftConsumptions.value = []
      isCloseShiftDialogOpen.value = false
      $q.notify({ type: 'positive', message: 'Turno cerrado exitosamente' })
    } catch (e: any) {
      $q.notify({ type: 'negative', message: e.data?.message || 'Error al cerrar turno' })
    } finally {
      saving.value = false
    }
  }

  // ---- 3. CONSUMO / MERMAS / APOYOS ----
  const openConsumptionDialog = async (type: 'CONSUMPTION' | 'LOSS' | 'SUPPORT') => {
    consumptionType.value = type
    consumptionItems.value = []
    searchQuery.value = ''
    selectedInstitutionId.value = null
    isConsumptionDialogVisible.value = true

    // Garantizar que siempre leemos el stock físico real y los consumos más recientes al abrir el modal
    try {
      await Promise.all([
        productsStore.fetchAll(),
        fetchShiftConsumptions()
      ])
    } catch (e) {
      console.error('Error refrescando inventario local', e)
    }

    if (type === 'SUPPORT' && institutions.value.length === 0) {
      try {
        institutions.value = await $fetch('/api/institutions?active=true') as any[]
      } catch (e) {
        console.error('Error cargando instituciones', e)
      }
    }
  }

  const filteredProducts = computed(() => {
    // 1. Mapear y filtrar solo los que tienen stock local > 0
    let available = productsStore.products.map(p => ({
      ...p,
      localStock: getLocalStock(p.id)
    })).filter(p => p.active && p.localStock > 0)

    // 2. Si hay texto, filtramos
    if (searchQuery.value) {
      const lowerQuery = searchQuery.value.toLowerCase()
      available = available.filter(p => 
        p.name.toLowerCase().includes(lowerQuery) || p.code.toLowerCase().includes(lowerQuery)
      )
    }

    // Ordenar alfabéticamente
    available.sort((a, b) => a.name.localeCompare(b.name))
    return searchQuery.value ? available.slice(0, 10) : available
  })

  const getLocalStock = (productId: number) => {
    const product = productsStore.products.find(p => p.id === productId)
    if (!product || !product.stocks || !activeWarehouseId.value) return 0
    const stock = product.stocks.find((s: any) => s.warehouseId === activeWarehouseId.value)
    const physicalStock = stock ? Number(stock.quantity) : 0

    // Restar las cantidades que están PENDIENTES de aprobación en el turno actual
    let pendingStock = 0
    for (const tx of shiftConsumptions.value) {
      if (tx.status === 'PENDING' && tx.details) {
        for (const detail of tx.details) {
          if (detail.productId === productId) {
            pendingStock += detail.quantity
          }
        }
      }
    }

    return physicalStock - pendingStock
  }

  const addConsumptionItem = (product: any) => {
    const stock = getLocalStock(product.id)
    if (stock <= 0) {
      $q.notify({ type: 'warning', message: 'No hay stock local de este producto.' })
      return
    }
    const existing = consumptionItems.value.find(i => i.productId === product.id)
    if (existing) {
      $q.notify({ type: 'info', message: 'El producto ya está en la lista' })
      return
    }
    consumptionItems.value.push({
      productId: product.id,
      productName: product.name,
      productCode: product.code,
      unit: product.unit?.abbreviation || 'UN',
      availableStock: stock,
      quantity: 1
    })
    searchQuery.value = ''
  }

  const removeConsumptionItem = (index: number) => {
    consumptionItems.value.splice(index, 1)
  }

  const submitConsumption = async () => {
    if (consumptionItems.value.length === 0) return $q.notify({ type: 'warning', message: 'La lista está vacía' })
    if (consumptionType.value === 'SUPPORT' && !selectedInstitutionId.value) {
      return $q.notify({ type: 'negative', message: 'Debe seleccionar una institución para el apoyo' })
    }
    
    for (const item of consumptionItems.value) {
      if (item.quantity <= 0) return $q.notify({ type: 'negative', message: 'La cantidad debe ser mayor a 0' })
      if (item.quantity > item.availableStock) return $q.notify({ type: 'negative', message: `Stock insuficiente para ${item.productName}` })
    }

    saving.value = true
    try {
      // 1. Crear el borrador
      const tx = await $fetch('/api/consumptions', {
        method: 'POST',
        body: { 
          type: consumptionType.value, 
          details: consumptionItems.value,
          warehouseId: activeWarehouseId.value,
          institutionId: selectedInstitutionId.value
        }
      })
      
      // 2. Enviar a Aprobación (PENDING)
      await $fetch(`/api/transfers/${tx.id}/status`, {
        method: 'PUT',
        body: { status: 'PENDING', notes: `Generado desde turno local` }
      })

      $q.notify({ type: 'positive', message: 'Registrado y enviado para aprobación gerencial' })
      isConsumptionDialogVisible.value = false
      await fetchShiftConsumptions()
    } catch (e: any) {
      $q.notify({ type: 'negative', message: e.data?.message || 'Error al registrar consumo' })
    } finally {
      saving.value = false
    }
  }

  const deleteConsumption = async (id: number) => {
    $q.dialog({ title: 'Eliminar Registro', message: '¿Estás seguro de eliminar este registro de consumo/merma? Esta acción no se puede deshacer.', cancel: true, color: 'negative' }).onOk(async () => {
      try {
        await $fetch(`/api/transfers/${id}`, { method: 'DELETE' })
        $q.notify({ type: 'positive', message: 'Registro eliminado correctamente' })
        await fetchShiftConsumptions()
      } catch (e: any) {
        $q.notify({ type: 'negative', message: e.data?.message || 'Error al eliminar el registro' })
      }
    })
  }

  onMounted(async () => {
    if (warehousesStore.warehouses.length === 0) await warehousesStore.fetchAll()
    await productsStore.fetchAll() // Siempre buscar inventario fresco al cargar la vista
    if (activeWarehouseId.value) {
      await Promise.all([fetchIncomingTransfers(), fetchActiveShift()])
    }
    loading.value = false
  })

  watch(activeWarehouseId, async (newId) => {
    if (newId) {
      loading.value = true
      await Promise.all([fetchIncomingTransfers(), fetchActiveShift()])
      loading.value = false
    } else {
      incomingTransfers.value = []
      activeShift.value = null
      shiftConsumptions.value = []
    }
  })

  return {
    loading, saving, hasAssignedWarehouse, assignedWarehouseName,
    isGlobalUser, activeWarehouseId,
    warehouses: computed(() => warehousesStore.warehouses),
    incomingTransfers, confirmReception,
    activeShift, openShiftDialog, submitOpenShift,
    openCloseShiftDialog, submitCloseShift,
    isShiftDialogOpen, isCloseShiftDialogOpen, shiftForm, closeShiftForm,
    shiftConsumptions, deleteConsumption, consumptionColumns,
    isConsumptionDialogVisible, consumptionType, consumptionItems, searchQuery, filteredProducts,
    selectedInstitutionId, institutions,
    openConsumptionDialog, addConsumptionItem, removeConsumptionItem, submitConsumption,
    fetchIncomingTransfers, fetchActiveShift
  }
}
