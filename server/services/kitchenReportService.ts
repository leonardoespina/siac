import { ReportsRepository } from '../repository/ReportsRepository'
import {
  normalizeServiceType,
  calculateServicesSummary,
  aggregateByKitchen,
  type RawConsumptionDetail,
  type KitchenReportResult,
  type ServiceType
} from '../domain/kitchenServices'

const reportsRepo = new ReportsRepository()

export interface KitchenServicesFilterParams {
  warehouseId?: number
  startDate?: Date
  endDate?: Date
  serviceType?: ServiceType
}

/**
 * 🏛️ SERVICE LAYER: Kitchen Services Report Service
 * 
 * Orquesta la obtención de datos crudos desde el Repositorio
 * y aplica las transformaciones y cálculos puros del Dominio.
 */
export async function getKitchenServicesReport(params: KitchenServicesFilterParams): Promise<KitchenReportResult> {
  const rawTransactions = await reportsRepo.getRawKitchenConsumptions(
    params.warehouseId,
    params.startDate,
    params.endDate
  )

  const items: RawConsumptionDetail[] = []

  for (const tx of rawTransactions) {
    const service = normalizeServiceType(tx.shift?.shiftType, tx.notes)

    // Si el usuario especificó un filtro de servicio particular y no coincide, lo omitimos
    if (params.serviceType && params.serviceType !== 'OTROS' && service !== params.serviceType) {
      continue
    }

    const warehouseName = tx.source?.name || 'Comedor No Asignado'
    const operatorName = tx.createdBy?.name || 'Operador'

    for (const d of tx.details) {
      const qty = Number(d.quantity)
      // Usar precio unitario congelado en la transacción, o fallback al precio de referencia del catálogo
      const price = Number(d.unitPrice) > 0 ? Number(d.unitPrice) : Number(d.product?.referencePrice || 0)
      const totalValue = Number((qty * price).toFixed(2))

      items.push({
        id: d.id,
        transactionId: tx.id,
        productId: d.productId,
        productName: d.product?.name || 'Producto Desconocido',
        productCode: d.product?.code || 'N/A',
        categoryName: d.product?.category?.name || 'Sin Categoría',
        unitAbbr: d.product?.unit?.abbreviation || 'UN',
        quantity: qty,
        unitPrice: price,
        totalValue: totalValue,
        warehouseId: tx.sourceId || 0,
        warehouseName: warehouseName,
        shiftId: tx.shift?.id || null,
        shiftType: tx.shift?.shiftType || null,
        serviceType: service,
        createdAt: tx.createdAt,
        operatorName: operatorName,
        notes: tx.notes
      })
    }
  }

  const summary = calculateServicesSummary(items)
  const byWarehouse = aggregateByKitchen(items)

  return {
    summary,
    byWarehouse,
    details: items
  }
}
