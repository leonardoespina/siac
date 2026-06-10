import { defineStore } from 'pinia'

export interface Supplier {
  id: number
  document: string
  name: string
  address?: string
  phone?: string
  email?: string
  active: boolean
}

export const useSuppliersStore = defineStore('suppliers', {
  state: () => ({
    suppliers: [] as Supplier[],
    loading: false
  }),
  actions: {
    async fetchAll() {
      this.loading = true
      try {
        const data = await $fetch<Supplier[]>('/api/suppliers')
        this.suppliers = data
      } finally {
        this.loading = false
      }
    },
    async create(data: Partial<Supplier>) {
      await $fetch('/api/suppliers', { method: 'POST', body: data })
      await this.fetchAll()
    },
    async update(id: number, data: Partial<Supplier>) {
      await $fetch(`/api/suppliers/${id}`, { method: 'PUT', body: data })
      await this.fetchAll()
    },
    async remove(id: number) {
      await $fetch(`/api/suppliers/${id}`, { method: 'DELETE' })
      await this.fetchAll()
    }
  }
})
