import { defineStore } from 'pinia'

/**
 * Interface representativa de una Categoría en el Frontend.
 */
export interface Category {
  id: number
  name: string
  description?: string
  active: boolean
}

/**
 * Store Pinia para gestionar el catálogo de Categorías.
 * Centraliza las peticiones a la API y mantiene el estado global.
 */
export const useCategoriesStore = defineStore('categories', {
  state: () => ({
    categories: [] as Category[],
    loading: false
  }),
  actions: {
    /**
     * Obtiene todas las categorías desde el backend y actualiza el estado.
     */
    async fetchAll() {
      this.loading = true
      try {
        const data = await $fetch<Category[]>('/api/categories')
        this.categories = data
      } finally {
        this.loading = false
      }
    },
    
    /**
     * Envía los datos para crear una nueva categoría.
     */
    async create(data: Partial<Category>) {
      await $fetch('/api/categories', {
        method: 'POST',
        body: data
      })
      await this.fetchAll() // Refresca la lista
    },

    /**
     * Actualiza la información de una categoría existente.
     */
    async update(id: number, data: Partial<Category>) {
      await $fetch(`/api/categories/${id}`, {
        method: 'PUT',
        body: data
      })
      await this.fetchAll()
    },

    /**
     * Ejecuta un borrado lógico (desactiva) la categoría.
     */
    async remove(id: number) {
      await $fetch(`/api/categories/${id}`, {
        method: 'DELETE'
      })
      await this.fetchAll()
    }
  }
})
