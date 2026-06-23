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
export const useProductsStore = defineStore('products', {
  state: () => ({
    products: [] as Product[],
    loading: false
  }),
  actions: {
    /**
     * Obtiene el listado completo de productos (con categorías y unidades).
     */
    async fetchAll() {
      this.loading = true
      try {
        const data = await $fetch<Product[]>('/api/products')
        this.products = data
      } finally {
        this.loading = false
      }
    },

    /**
     * Crea un nuevo producto en el catálogo.
     */
    async create(data: Partial<Product>) {
      await $fetch('/api/products', {
        method: 'POST',
        body: data
      })
      await this.fetchAll()
    },

    /**
     * Actualiza la información de un producto maestro.
     */
    async update(id: number, data: Partial<Product>) {
      await $fetch(`/api/products/${id}`, {
        method: 'PUT',
        body: data
      })
      await this.fetchAll()
    },

    async remove(id: number) {
      await $fetch(`/api/products/${id}`, {
        method: 'DELETE'
      })
      await this.fetchAll()
    },

    /**
     * Actualiza el stock de un producto específico en la memoria (Reatividad Socket)
     */
    updateProductStock(productId: number, warehouseId: number, newQuantity: number | string) {
      const product = this.products.find(p => p.id === productId)
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
  }
})
