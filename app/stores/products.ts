import { defineStore } from 'pinia'
import type { Category } from './categories'
import type { Unit } from './units'

/**
 * Interface representativa de un Producto con sus relaciones pobladas.
 */
export interface Product {
  id: number
  code: string
  name: string
  description?: string
  categoryId: number
  unitId: number
  minimumStock: number
  maximumStock?: number
  isPerishable: boolean
  active: boolean
  
  // Relaciones anidadas
  category?: Category
  unit?: Unit
  stocks?: any[]
}

/**
 * Store Pinia para el catálogo maestro de Productos.
 */
export const useProductsStore = defineStore('products', () => {
  const products = ref<Product[]>([])
  const loading = ref(false)

  const activeProducts = computed(() => products.value.filter(p => p.active))

  async function fetchAll() {
    loading.value = true
    try {
      const data = await $fetch<Product[]>('/api/products')
      products.value = data
    } finally {
      loading.value = false
    }
  }

  async function create(data: Partial<Product>) {
    await $fetch('/api/products', {
      method: 'POST',
      body: data
    })
    await fetchAll()
  }

  async function update(id: number, data: Partial<Product>) {
    await $fetch(`/api/products/${id}`, {
      method: 'PUT',
      body: data
    })
    await fetchAll()
  }

  async function remove(id: number) {
    await $fetch(`/api/products/${id}`, {
      method: 'DELETE'
    })
    await fetchAll()
  }

  function updateProductStock(productId: number, warehouseId: number, newQuantity: number | string) {
    const product = products.value.find(p => p.id === productId)
    if (product) {
      if (!product.stocks) product.stocks = []
      const stockIndex = product.stocks.findIndex((s: any) => s.warehouseId === warehouseId)
      if (stockIndex >= 0) {
        product.stocks[stockIndex].quantity = newQuantity
      } else {
        product.stocks.push({ warehouseId, productId, quantity: newQuantity })
      }
    }
  }

  return {
    products,
    loading,
    activeProducts,
    fetchAll,
    create,
    update,
    remove,
    updateProductStock
  }
})
