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

export const useSuppliersStore = defineStore('suppliers', () => {
  const suppliers = ref<Supplier[]>([])
  const loading = ref(false)

  const activeSuppliers = computed(() => suppliers.value.filter(s => s.active))

  async function fetchAll() {
    loading.value = true
    try {
      const data = await $fetch<Supplier[]>('/api/suppliers')
      suppliers.value = data
    } finally {
      loading.value = false
    }
  }

  async function create(data: Partial<Supplier>) {
    await $fetch('/api/suppliers', { method: 'POST', body: data })
    await fetchAll()
  }

  async function update(id: number, data: Partial<Supplier>) {
    await $fetch(`/api/suppliers/${id}`, { method: 'PUT', body: data })
    await fetchAll()
  }

  async function remove(id: number) {
    await $fetch(`/api/suppliers/${id}`, { method: 'DELETE' })
    await fetchAll()
  }

  return {
    suppliers,
    loading,
    activeSuppliers,
    fetchAll,
    create,
    update,
    remove
  }
})
