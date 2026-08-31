import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useReportsStore = defineStore('reports', () => {
  const matrixData = ref<{ dispatches: any[]; rows: any[] } | null>(null)
  const kitchenServicesData = ref<{
    summary: any
    byWarehouse: any[]
    details: any[]
  } | null>(null)

  const fetchReceptionsMatrix = async (filters: any) => {
    try {
      const data = await $fetch('/api/reports/receptions-matrix', { query: filters })
      matrixData.value = data as any
      return data
    } catch (error) {
      throw error
    }
  }

  const fetchKitchenServicesReport = async (filters: {
    startDate?: string
    endDate?: string
    warehouseId?: number | null
    serviceType?: string | null
  }) => {
    try {
      const query: Record<string, any> = {}
      if (filters.startDate) query.startDate = filters.startDate
      if (filters.endDate) query.endDate = filters.endDate
      if (filters.warehouseId) query.warehouseId = filters.warehouseId
      if (filters.serviceType) query.serviceType = filters.serviceType

      const data = await $fetch('/api/reports/kitchen-services', { query })
      kitchenServicesData.value = data as any
      return data
    } catch (error) {
      throw error
    }
  }

  return {
    matrixData,
    kitchenServicesData,
    fetchReceptionsMatrix,
    fetchKitchenServicesReport
  }
})
