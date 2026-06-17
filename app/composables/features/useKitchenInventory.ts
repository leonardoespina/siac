import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useWarehousesStore } from '~/stores/warehouses'
import { useProductsStore } from '~/stores/products'

export function useKitchenInventory() {
  const auth = useAuthStore()
  const warehousesStore = useWarehousesStore()
  const productsStore = useProductsStore()

  const loading = ref(true)
  const searchQuery = ref('')
  const hideOutOfStock = ref(false)

  // Variables para el Modo Administrador
  const isGlobalUser = computed(() => !auth.user?.warehouseId)
  const activeWarehouseId = ref<number | null>(auth.user?.warehouseId || null)

  // Determinar si tiene un almacén asignado/seleccionado
  const hasAssignedWarehouse = computed(() => !!activeWarehouseId.value)

  // Extraer el stock local de un producto (null si NUNCA ha estado en este almacén)
  const getLocalStock = (productId: number): number | null => {
    const product = productsStore.products.find(p => p.id === productId)
    if (!product || !product.stocks || !activeWarehouseId.value) return null
    const stock = product.stocks.find((s: any) => s.warehouseId === activeWarehouseId.value)
    return stock ? Number(stock.quantity) : null
  }

  // Lista calculada de productos con el stock inyectado
  const inventoryList = computed(() => {
    if (!hasAssignedWarehouse.value) return []

    let list = productsStore.products.map(p => ({
      ...p,
      localStock: getLocalStock(p.id)
    }))

    // Filtro principal: Solo activos y que SÍ hayan estado en este almacén alguna vez
    list = list.filter(p => p.active && p.localStock !== null)

    // Filtro: Ocultar agotados
    if (hideOutOfStock.value) {
      list = list.filter(p => p.localStock > 0)
    }

    // Filtro: Búsqueda por texto
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      list = list.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.code.toLowerCase().includes(q) ||
        p.category?.name.toLowerCase().includes(q)
      )
    }

    return list
  })

  // Estadísticas rápidas
  const stats = computed(() => {
    const totalItems = inventoryList.value.length
    const outOfStock = inventoryList.value.filter(p => p.localStock === 0).length
    const inStock = totalItems - outOfStock
    return { totalItems, inStock, outOfStock }
  })

  onMounted(async () => {
    if (warehousesStore.warehouses.length === 0) await warehousesStore.fetchAll()
    if (productsStore.products.length === 0) {
      await productsStore.fetchAll()
    }
    loading.value = false
  })

  return {
    loading,
    isGlobalUser,
    activeWarehouseId,
    warehouses: computed(() => warehousesStore.warehouses),
    hasAssignedWarehouse,
    searchQuery,
    hideOutOfStock,
    inventoryList,
    stats
  }
}
