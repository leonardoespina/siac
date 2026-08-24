import { useWarehousesStore } from '~/stores/warehouses'
import * as XLSX from 'xlsx'

export function useExcelProductExport() {
  const warehousesStore = useWarehousesStore()

  // Calcular Stock Central de forma idéntica a la vista
  const getCentralStock = (product: any) => {
    const central = warehousesStore.warehouses.find(w => w.type === 'CENTRAL')
    if (!central || !product.stocks) return 0
    const stock = product.stocks.find((s: any) => s.warehouseId === central.id)
    return stock ? Number(stock.quantity) : 0
  }

  // Calcular Stock Locales (Cocinas) de forma idéntica a la vista
  const getLocalStock = (product: any) => {
    const locals = warehousesStore.warehouses.filter(w => w.type === 'LOCAL')
    if (locals.length === 0 || !product.stocks) return 0
    
    let total = 0
    for (const local of locals) {
      const stock = product.stocks.find((s: any) => s.warehouseId === local.id)
      if (stock) total += Number(stock.quantity)
    }
    return total
  }

  const exportProducts = (products: any[]) => {
    // Definición de Cabecera
    const wsData: any[][] = [
      [
        'CÓDIGO',
        'NOMBRE',
        'CATEGORÍA',
        'STOCK CENTRAL',
        'STOCK LOCALES (COCINAS)',
        'UNIDAD',
        'STOCK MÍNIMO',
        'COSTO REFERENCIAL',
        'PERECEDERO',
        'ESTADO'
      ]
    ]

    // Mapear datos de los productos
    products.forEach(p => {
      wsData.push([
        p.code,
        p.name,
        p.category?.name || 'Sin Categoría',
        getCentralStock(p),
        getLocalStock(p),
        p.unit?.abbreviation || 'UN',
        Number(p.minimumStock || 0),
        Number(p.referencePrice || 0),
        p.isPerishable ? 'Sí' : 'No',
        p.active ? 'Activo' : 'Inactivo'
      ])
    })

    // Crear hoja de trabajo y libro
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Catálogo de Productos')
    
    // Auto-ajustar el ancho de las columnas
    const maxLens = wsData[0].map((_, colIdx) => 
      Math.max(...wsData.map(row => String(row[colIdx] || '').length))
    )
    ws['!cols'] = maxLens.map(len => ({ wch: len + 3 }))

    // Guardar archivo Excel
    const dateStr = new Date().toISOString().split('T')[0]
    XLSX.writeFile(wb, `Catalogo_Productos_${dateStr}.xlsx`)
  }

  return { exportProducts }
}
