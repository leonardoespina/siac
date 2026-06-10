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
export const useUnitsStore = defineStore('units', {
  state: () => ({
    units: [] as Unit[],
    loading: false
  }),
  actions: {
    /**
     * Carga todas las unidades desde el servidor.
     */
    async fetchAll() {
      this.loading = true
      try {
        const data = await $fetch<Unit[]>('/api/units')
        this.units = data
      } finally {
        this.loading = false
      }
    },

    /**
     * Registra una nueva unidad de medida.
     */
    async create(data: Partial<Unit>) {
      await $fetch('/api/units', {
        method: 'POST',
        body: data
      })
      await this.fetchAll()
    },

    /**
     * Edita una unidad existente.
     */
    async update(id: number, data: Partial<Unit>) {
      await $fetch(`/api/units/${id}`, {
        method: 'PUT',
        body: data
      })
      await this.fetchAll()
    },

    /**
     * Desactiva lógicamente una unidad.
     */
    async remove(id: number) {
      await $fetch(`/api/units/${id}`, {
        method: 'DELETE'
      })
      await this.fetchAll()
    }
  }
})
