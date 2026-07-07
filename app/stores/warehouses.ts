import { defineStore } from 'pinia'

/**
 * Tipos de almacén permitidos.
 */
export type WarehouseType = 'CENTRAL' | 'LOCAL'

/**
 * Interface representativa de un Almacén.
 */
export interface Warehouse {
  id: number
  name: string
  type: WarehouseType
  location?: string
  active: boolean
}

/**
 * Store Pinia para gestionar los Almacenes y sus configuraciones.
 */
export const useWarehousesStore = defineStore('warehouses', () => {
  const warehouses = ref<Warehouse[]>([])
  const loading = ref(false)

  // Getters
  const activeWarehouses = computed(() => warehouses.value.filter(w => w.active))
  const localWarehouses = computed(() => warehouses.value.filter(w => w.type === 'LOCAL'))
  const centralWarehouses = computed(() => warehouses.value.filter(w => w.type === 'CENTRAL'))

  async function fetchAll() {
    loading.value = true
    try {
      const data = await $fetch<Warehouse[]>('/api/warehouses')
      warehouses.value = data
    } finally {
      loading.value = false
    }
  }

  async function create(data: Partial<Warehouse>) {
    await $fetch('/api/warehouses', {
      method: 'POST',
      body: data
    })
    await fetchAll()
  }

  async function update(id: number, data: Partial<Warehouse>) {
    await $fetch(`/api/warehouses/${id}`, {
      method: 'PUT',
      body: data
    })
    await fetchAll()
  }

  async function remove(id: number) {
    await $fetch(`/api/warehouses/${id}`, {
      method: 'DELETE'
    })
    await fetchAll()
  }

  return {
    warehouses,
    loading,
    activeWarehouses,
    localWarehouses,
    centralWarehouses,
    fetchAll,
    create,
    update,
    remove
  }
})
