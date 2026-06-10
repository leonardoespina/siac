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
export const useWarehousesStore = defineStore('warehouses', {
  state: () => ({
    warehouses: [] as Warehouse[],
    loading: false
  }),
  actions: {
    /**
     * Carga todos los almacenes registrados (Centrales y Locales).
     */
    async fetchAll() {
      this.loading = true
      try {
        const data = await $fetch<Warehouse[]>('/api/warehouses')
        this.warehouses = data
      } finally {
        this.loading = false
      }
    },

    /**
     * Registra un nuevo almacén físico.
     */
    async create(data: Partial<Warehouse>) {
      await $fetch('/api/warehouses', {
        method: 'POST',
        body: data
      })
      await this.fetchAll()
    },

    /**
     * Actualiza los datos de un almacén existente.
     */
    async update(id: number, data: Partial<Warehouse>) {
      await $fetch(`/api/warehouses/${id}`, {
        method: 'PUT',
        body: data
      })
      await this.fetchAll()
    },

    /**
     * Deshabilita un almacén para evitar futuros movimientos en él.
     */
    async remove(id: number) {
      await $fetch(`/api/warehouses/${id}`, {
        method: 'DELETE'
      })
      await this.fetchAll()
    }
  }
})
