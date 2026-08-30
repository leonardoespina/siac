import { ref, computed, readonly } from 'vue'
import { useQuasar, date } from 'quasar'
import { useReportsStore } from '~/stores/reports'
import { formatCurrency, formatQuantity } from '~/composables/shared/useNumberFormatter'
import * as XLSX from 'xlsx'

export function useKitchenServicesReport() {
  const $q = useQuasar()
  const reportsStore = useReportsStore()

  const loading = ref(false)

  const today = new Date()
  const startDate = ref(date.formatDate(today, 'YYYY-MM-DD'))
  const endDate = ref(date.formatDate(today, 'YYYY-MM-DD'))
  const selectedWarehouse = ref<number | null>(null)
  const selectedService = ref<string | null>(null)

  const summary = computed(() => {
    return reportsStore.kitchenServicesData?.summary || {
      DESAYUNO: { totalValue: 0, totalItems: 0, transactionCount: 0 },
      ALMUERZO: { totalValue: 0, totalItems: 0, transactionCount: 0 },
      CENA: { totalValue: 0, totalItems: 0, transactionCount: 0 },
      SOBRECENA: { totalValue: 0, totalItems: 0, transactionCount: 0 },
      OTROS: { totalValue: 0, totalItems: 0, transactionCount: 0 },
      grandTotalValue: 0,
      grandTotalItems: 0,
      totalTransactions: 0
    }
  })

  const byWarehouse = computed(() => reportsStore.kitchenServicesData?.byWarehouse || [])
  const details = computed(() => reportsStore.kitchenServicesData?.details || [])

  const fetchReport = async () => {
    loading.value = true
    try {
      const startISO = startDate.value ? new Date(startDate.value + 'T00:00:00').toISOString() : undefined
      const endISO = endDate.value ? new Date(endDate.value + 'T23:59:59').toISOString() : undefined

      await reportsStore.fetchKitchenServicesReport({
        startDate: startISO,
        endDate: endISO,
        warehouseId: selectedWarehouse.value,
        serviceType: selectedService.value
      })
    } catch (e: any) {
      console.error(e)
      $q.notify({
        type: 'negative',
        message: e.data?.message || 'Error al cargar el reporte de consumos por servicios'
      })
    } finally {
      loading.value = false
    }
  }

  // Accesos rápidos de fecha
  const setToday = () => {
    const d = new Date()
    startDate.value = date.formatDate(d, 'YYYY-MM-DD')
    endDate.value = date.formatDate(d, 'YYYY-MM-DD')
    fetchReport()
  }

  const setThisWeek = () => {
    const now = new Date()
    const firstDay = new Date(now.setDate(now.getDate() - now.getDay() + 1))
    const lastDay = new Date(now.setDate(now.getDate() - now.getDay() + 7))
    startDate.value = date.formatDate(firstDay, 'YYYY-MM-DD')
    endDate.value = date.formatDate(lastDay, 'YYYY-MM-DD')
    fetchReport()
  }

  const setThisMonth = () => {
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    startDate.value = date.formatDate(firstDay, 'YYYY-MM-DD')
    endDate.value = date.formatDate(lastDay, 'YYYY-MM-DD')
    fetchReport()
  }

  // Exportar a Excel
  const exportToExcel = (warehouseLabel: string = 'Todas las Cocinas') => {
    if (!reportsStore.kitchenServicesData) {
      $q.notify({ type: 'warning', message: 'No hay datos cargados para exportar' })
      return
    }

    const wb = XLSX.utils.book_new()

    // HOJA 1: RESUMEN FINANCIERO POR SERVICIOS
    const sum = summary.value
    const summarySheetData = [
      ['SISTEMA INTEGRAL DE ALIMENTACIÓN Y COMEDORES (SIAC)'],
      ['REPORTE EJECUTIVO DE CONSUMOS POR SERVICIOS Y COCINA'],
      [`Período: ${startDate.value} al ${endDate.value}`],
      [`Comedor / Cocina: ${warehouseLabel}`],
      [],
      ['RESUMEN CONSOLIDADO POR SERVICIO'],
      ['SERVICIO', 'CANTIDAD (UNDS/KG)', 'TOTAL FACTURADO ($)', 'DESPACHOS REGISTRADOS'],
      ['Desayuno', sum.DESAYUNO.totalItems, sum.DESAYUNO.totalValue, sum.DESAYUNO.transactionCount],
      ['Almuerzo', sum.ALMUERZO.totalItems, sum.ALMUERZO.totalValue, sum.ALMUERZO.transactionCount],
      ['Cena', sum.CENA.totalItems, sum.CENA.totalValue, sum.CENA.transactionCount],
      ['Sobrecena', sum.SOBRECENA.totalItems, sum.SOBRECENA.totalValue, sum.SOBRECENA.transactionCount],
      ['Otros Servicios', sum.OTROS.totalItems, sum.OTROS.totalValue, sum.OTROS.transactionCount],
      ['TOTAL GENERAL', sum.grandTotalItems, sum.grandTotalValue, sum.totalTransactions],
      [],
      ['DESGLOSE POR COMEDOR / COCINA'],
      ['COMEDOR', 'DESAYUNO ($)', 'ALMUERZO ($)', 'CENA ($)', 'SOBRECENA ($)', 'OTROS ($)', 'TOTAL ($)']
    ]

    byWarehouse.value.forEach((wh: any) => {
      summarySheetData.push([
        wh.warehouseName,
        wh.services?.DESAYUNO?.value || 0,
        wh.services?.ALMUERZO?.value || 0,
        wh.services?.CENA?.value || 0,
        wh.services?.SOBRECENA?.value || 0,
        wh.services?.OTROS?.value || 0,
        wh.totalValue
      ])
    })

    const wsSummary = XLSX.utils.aoa_to_sheet(summarySheetData)
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen Servicios')

    // HOJA 2: DETALLE LÍNEA POR LÍNEA
    const detailHeader = [
      'Nº Despacho',
      'Fecha / Hora',
      'Comedor / Cocina',
      'Servicio',
      'Código',
      'Producto',
      'Rubro / Categoría',
      'Cantidad',
      'Unidad',
      'Costo Unitario ($)',
      'Total ($)',
      'Operador / Responsable',
      'Notas'
    ]

    const detailRows = details.value.map((d: any) => [
      d.transactionId,
      new Date(d.createdAt).toLocaleString(),
      d.warehouseName,
      d.serviceType,
      d.productCode,
      d.productName,
      d.categoryName,
      d.quantity,
      d.unitAbbr,
      d.unitPrice,
      d.totalValue,
      d.operatorName,
      d.notes || ''
    ])

    const wsDetails = XLSX.utils.aoa_to_sheet([detailHeader, ...detailRows])
    XLSX.utils.book_append_sheet(wb, wsDetails, 'Detalle Despachos')

    const dateSlug = `${startDate.value}_al_${endDate.value}`
    XLSX.writeFile(wb, `Reporte_Consumo_Servicios_${dateSlug}.xlsx`)
    $q.notify({ type: 'positive', message: 'Reporte Excel descargado exitosamente' })
  }

  return {
    loading: readonly(loading),
    startDate,
    endDate,
    selectedWarehouse,
    selectedService,
    summary,
    byWarehouse,
    details,
    fetchReport,
    setToday,
    setThisWeek,
    setThisMonth,
    exportToExcel
  }
}
