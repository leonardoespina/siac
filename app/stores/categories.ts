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
export const useCategoriesStore = defineStore('categories', () => {
  // ── Estado ──
  const categories = ref<Category[]>([])
  const loading = ref(false)

  // ── Getters ──
  const activeCategories = computed(() => categories.value.filter(c => c.active))

  // ── Acciones ──
  async function fetchAll() {
    loading.value = true
    try {
      const data = await $fetch<Category[]>('/api/categories')
      categories.value = data
    } finally {
      loading.value = false
    }
  }
  
  async function create(data: Partial<Category>) {
    await $fetch('/api/categories', {
      method: 'POST',
      body: data
    })
    await fetchAll()
  }

  async function update(id: number, data: Partial<Category>) {
    await $fetch(`/api/categories/${id}`, {
      method: 'PUT',
      body: data
    })
    await fetchAll()
  }

  async function remove(id: number) {
    await $fetch(`/api/categories/${id}`, {
      method: 'DELETE'
    })
    await fetchAll()
  }

  return {
    categories,
    loading,
    activeCategories,
    fetchAll,
    create,
    update,
    remove
  }
})
