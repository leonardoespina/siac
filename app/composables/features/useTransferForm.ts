import { ref, computed } from 'vue'
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
  const destinationId = ref<number | null>(null)
  const searchQuery = ref('')
  const transferItems = ref<any[]>([])
  
  // Toggle visual (Pedido por el usuario)
  const showPrices = ref(false)

  // Almacén central (origen fijo)
  const centralWarehouse = computed(() => warehousesStore.warehouses.find(w => w.type === 'CENTRAL'))
  
  // Almacenes locales (cocinas) para el selector de destino
  const localWarehouses = computed(() => warehousesStore.warehouses.filter(w => w.type === 'LOCAL'))

  // Buscador de productos
  const filteredProducts = computed(() => {
    if (!searchQuery.value) return []
    const lowerQuery = searchQuery.value.toLowerCase()
    return productsStore.products.filter(p => 
      p.active && (p.name.toLowerCase().includes(lowerQuery) || p.code.toLowerCase().includes(lowerQuery))
    ).slice(0, 8)
  })

  // Helper para obtener el stock central de un producto
  const getCentralStock = (productId: number) => {
    if (!centralWarehouse.value) return 0
    const product = productsStore.products.find(p => p.id === productId)
    if (!product || !product.stocks) return 0
    const stock = product.stocks.find((s: any) => s.warehouseId === centralWarehouse.value!.id)
    return stock ? Number(stock.quantity) : 0
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
      unitPrice: Number(product.referencePrice) || 0 // Hereda automáticamente el costo referencial
    })
    
    searchQuery.value = ''
  }

  const removeItem = (index: number) => {
    transferItems.value.splice(index, 1)
  }

  const saveDraft = async () => {
    if (!destinationId.value) return $q.notify({ type: 'negative', message: 'Seleccione el almacén destino (Cocina)' })
    if (transferItems.value.length === 0) return $q.notify({ type: 'negative', message: 'Agregue al menos un producto a la transferencia' })
    
    for (const item of transferItems.value) {
      if (item.quantity <= 0) return $q.notify({ type: 'negative', message: `La cantidad de ${item.productName} debe ser mayor a 0` })
      if (item.quantity > item.availableStock) {
        return $q.notify({ type: 'negative', message: `Solo hay ${item.availableStock} ${item.unit} de ${item.productName} en el Almacén Central` })
      }
    }

    saving.value = true
    try {
      const { id } = await $fetch('/api/transfers', {
        method: 'POST',
        body: {
          sourceId: centralWarehouse.value?.id,
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
    destinationId,
    searchQuery,
    transferItems,
    showPrices,
    localWarehouses,
    filteredProducts,
    centralWarehouse,
    getCentralStock,
    addItem,
    removeItem,
    saveDraft
  }
}
