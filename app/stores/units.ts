import { defineStore } from 'pinia'

/**
 * Interface representativa de una Unidad de Medida en el Frontend.
 */
export interface Unit {
  id: number
  name: string
  abbreviation: string
  active: boolean
}

/**
 * Store Pinia para gestionar las Unidades de Medida.
 */
export const useUnitsStore = defineStore('units', () => {
  const units = ref<Unit[]>([])
  const loading = ref(false)

  const activeUnits = computed(() => units.value.filter(u => u.active))

  async function fetchAll() {
    loading.value = true
    try {
      const data = await $fetch<Unit[]>('/api/units')
      units.value = data
    } finally {
      loading.value = false
    }
  }

  async function create(data: Partial<Unit>) {
    await $fetch('/api/units', {
      method: 'POST',
      body: data
    })
    await fetchAll()
  }

  async function update(id: number, data: Partial<Unit>) {
    await $fetch(`/api/units/${id}`, {
      method: 'PUT',
      body: data
    })
    await fetchAll()
  }

  async function remove(id: number) {
    await $fetch(`/api/units/${id}`, {
      method: 'DELETE'
    })
    await fetchAll()
  }

  return {
    units,
    loading,
    activeUnits,
    fetchAll,
    create,
    update,
    remove
  }
})
