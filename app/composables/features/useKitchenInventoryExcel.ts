import * as XLSX from 'xlsx'
import { roundQty } from '~/composables/shared/useNumberFormatter'

export function useKitchenInventoryExcel() {
  const exportKitchenInventory = (
    warehouseName: string,
    operatorName: string,
    inventoryList: any[],
    stats: { totalItems: number; inStock: number; outOfStock: number }
  ) => {
    const formattedDate = new Date().toLocaleString()
    const dateSlug = new Date().toISOString().split('T')[0]
    const cleanWarehouseSlug = (warehouseName || 'Comedor').replace(/[^a-zA-Z0-9_-]/g, '_')

    // Estructura de cabecera y metadatos
    const wsData: any[][] = [
      ['REPORTE DE INVENTARIO FÍSICO LOCAL'],
      ['SISTEMA INTEGRAL DE ALMACENES DE COMEDORES (SIAC)'],
      [],
      ['Comedor / Almacén:', warehouseName, '', 'Total en Catálogo:', stats.totalItems],
      ['Fecha del Reporte:', formattedDate, '', 'Con Existencia:', stats.inStock],
      ['Operador Responsable:', operatorName, '', 'Agotados:', stats.outOfStock],
      [],
      [
        'CÓDIGO',
        'PRODUCTO',
        'CATEGORÍA',
        'STOCK DISPONIBLE',
        'UNIDAD',
        'ESTADO'
      ]
    ]

    // Filas de datos
    inventoryList.forEach(item => {
      const stock = roundQty(item.localStock || 0)
      wsData.push([
        item.code,
        item.name,
        item.category?.name || 'Sin Categoría',
        stock,
        item.unit?.abbreviation || 'UN',
        stock > 0 ? 'DISPONIBLE' : 'AGOTADO'
      ])
    })

    const ws = XLSX.utils.aoa_to_sheet(wsData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Inventario Local')

    // Ancho de columnas adaptativo
    const colWidths = [
      { wch: 14 }, // Código
      { wch: 38 }, // Producto
      { wch: 22 }, // Categoría
      { wch: 18 }, // Stock Disponible
      { wch: 12 }, // Unidad
      { wch: 15 }  // Estado
    ]
    ws['!cols'] = colWidths

    XLSX.writeFile(wb, `Inventario_${cleanWarehouseSlug}_${dateSlug}.xlsx`)
  }

  return {
    exportKitchenInventory
  }
}
