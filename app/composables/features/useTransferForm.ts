import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useWarehousesStore } from '~/stores/warehouses'
import { useProductsStore } from '~/stores/products'

export function useTransferForm() {
  const router = useRouter()
  const $q = useQuasar()
  const warehousesStore = useWarehousesStore()
  const productsStore = useProductsStore()

  const saving = ref(false)
  const sourceId = ref<number | null>(null)
  const destinationId = ref<number | null>(null)
  const searchQuery = ref('')
  const transferItems = ref<any[]>([])
  
  // Toggle visual (Pedido por el usuario)
  const showPrices = ref(false)

  // Almacenes disponibles
  const availableSources = computed(() => warehousesStore.warehouses)

  const availableDestinations = computed(() => 
    warehousesStore.warehouses.filter(w => w.id !== sourceId.value)
  )

  // Limpiar carrito si cambian el origen
  watch(sourceId, () => {
    if (transferItems.value.length > 0) {
      transferItems.value = []
      $q.notify({ type: 'info', message: 'La cesta se ha vaciado debido al cambio de Almacén de Origen' })
    }
  })

  // Buscador de productos
  const filteredProducts = computed(() => {
    const lowerQuery = (searchQuery.value || '').toLowerCase()
    return productsStore.products.filter(p => {
      if (!p.active) return false
      if (!lowerQuery) return true
      return p.name.toLowerCase().includes(lowerQuery) || p.code.toLowerCase().includes(lowerQuery)
    })
  })

  // Helper para obtener el stock en un almacén específico
  const getStock = (productId: number, warehouseId: number | null) => {
    if (!warehouseId) return 0
    const product = productsStore.products.find(p => p.id === productId)
    if (!product || !product.stocks) return 0
    const stock = product.stocks.find((s: any) => s.warehouseId === warehouseId)
    return stock ? Number(stock.quantity) : 0
  }

  const addItem = (product: any) => {
    const existing = transferItems.value.find(i => i.productId === product.id)
    if (existing) {
      $q.notify({ type: 'warning', message: 'El producto ya está en la lista' })
      return
    }
    
    if (!sourceId.value) {
      $q.notify({ type: 'warning', message: 'Seleccione primero el almacén de origen' })
      return
    }

    transferItems.value.push({
      productId: product.id,
      productName: product.name,
      productCode: product.code,
      unit: product.unit?.abbreviation || 'UN',
      availableStock: getStock(product.id, sourceId.value),
      quantity: 1,
      unitPrice: Number(product.referencePrice) || 0 // Hereda automáticamente el costo referencial
    })
    
    searchQuery.value = ''
  }

  const removeItem = (index: number) => {
    transferItems.value.splice(index, 1)
  }

  const saveDraft = async () => {
    if (!sourceId.value) return $q.notify({ type: 'negative', message: 'Seleccione el almacén de origen' })
    if (!destinationId.value) return $q.notify({ type: 'negative', message: 'Seleccione el almacén destino' })
    if (sourceId.value === destinationId.value) return $q.notify({ type: 'negative', message: 'El origen y el destino no pueden ser el mismo almacén' })
    if (transferItems.value.length === 0) return $q.notify({ type: 'negative', message: 'Agregue al menos un producto a la transferencia' })
    
    for (const item of transferItems.value) {
      if (item.quantity <= 0) return $q.notify({ type: 'negative', message: `La cantidad de ${item.productName} debe ser mayor a 0` })
      if (item.quantity > item.availableStock) {
        return $q.notify({ type: 'negative', message: `Solo hay ${item.availableStock} ${item.unit} de ${item.productName} en el almacén de origen` })
      }
    }

    saving.value = true
    try {
      const { id } = await $fetch('/api/transfers', {
        method: 'POST',
        body: {
          sourceId: sourceId.value,
          destinationId: destinationId.value,
          details: transferItems.value
        }
      })
      $q.notify({ type: 'positive', message: 'Transferencia guardada como Borrador' })
      router.push(`/inventory/transfers/${id}`)
    } catch (e: any) {
      $q.notify({ type: 'negative', message: e.data?.message || 'Error al guardar la transferencia' })
    } finally {
      saving.value = false
    }
  }

  return {
    saving,
    sourceId,
    destinationId,
    searchQuery,
    transferItems,
    showPrices,
    availableSources,
    availableDestinations,
    filteredProducts,
    getStock,
    addItem,
    removeItem,
    saveDraft
  }
}
