/**
 * 🏛️ DOMAIN LAYER: Kitchen Services Domain
 * 
 * Regla de Oro: Funciones puras, tipos e interfaces estrictas.
 * CERO dependencias externas (sin Prisma, sin H3, sin EventBus).
 */

export type ServiceType = 'DESAYUNO' | 'ALMUERZO' | 'CENA' | 'SOBRECENA' | 'OTROS'

export const VALID_SERVICES: ServiceType[] = ['DESAYUNO', 'ALMUERZO', 'CENA', 'SOBRECENA', 'OTROS']

export interface RawConsumptionDetail {
  id: number
  transactionId: number
  productId: number
  productName: string
  productCode: string
  categoryName: string
  unitAbbr: string
  quantity: number
  unitPrice: number
  totalValue: number
  warehouseId: number
  warehouseName: string
  shiftId: number | null
  shiftType: string | null
  serviceType: ServiceType
  createdAt: Date
  operatorName: string
  notes?: string | null
}

export interface ServiceMetric {
  service: ServiceType
  label: string
  totalValue: number
  totalItems: number
  transactionCount: number
}

export interface ServicesSummary {
  DESAYUNO: ServiceMetric
  ALMUERZO: ServiceMetric
  CENA: ServiceMetric
  SOBRECENA: ServiceMetric
  OTROS: ServiceMetric
  grandTotalValue: number
  grandTotalItems: number
  totalTransactions: number
}

export interface KitchenServiceBreakdown {
  warehouseId: number
  warehouseName: string
  totalValue: number
  totalItems: number
  services: Record<ServiceType, { value: number; items: number }>
}

export interface KitchenReportResult {
  summary: ServicesSummary
  byWarehouse: KitchenServiceBreakdown[]
  details: RawConsumptionDetail[]
}

/**
 * Mapea un tipo de turno o notas a uno de los 4 servicios estándar.
 */
export function normalizeServiceType(shiftType?: string | null, notes?: string | null): ServiceType {
  if (!shiftType && !notes) return 'OTROS'

  const normalizedShift = (shiftType || '').trim().toUpperCase()
  const normalizedNotes = (notes || '').trim().toUpperCase()

  if (normalizedShift.includes('DESAYUNO') || normalizedNotes.includes('DESAYUNO')) return 'DESAYUNO'
  if (normalizedShift.includes('ALMUERZO') || normalizedNotes.includes('ALMUERZO')) return 'ALMUERZO'
  if (normalizedShift.includes('CENA') || normalizedNotes.includes('CENA')) {
    if (normalizedShift.includes('SOBRECENA') || normalizedNotes.includes('SOBRECENA')) return 'SOBRECENA'
    return 'CENA'
  }
  if (normalizedShift.includes('SOBRECENA') || normalizedNotes.includes('SOBRECENA')) return 'SOBRECENA'

  // Turnos DIURNO / NOCTURNO por retrocompatibilidad
  if (normalizedShift === 'DIURNO') return 'ALMUERZO'
  if (normalizedShift === 'NOCTURNO') return 'CENA'

  return 'OTROS'
}

/**
 * Calcula los totales consolidados por servicio y el gran total general.
 */
export function calculateServicesSummary(items: RawConsumptionDetail[]): ServicesSummary {
  const summary: ServicesSummary = {
    DESAYUNO: { service: 'DESAYUNO', label: 'Desayuno', totalValue: 0, totalItems: 0, transactionCount: 0 },
    ALMUERZO: { service: 'ALMUERZO', label: 'Almuerzo', totalValue: 0, totalItems: 0, transactionCount: 0 },
    CENA: { service: 'CENA', label: 'Cena', totalValue: 0, totalItems: 0, transactionCount: 0 },
    SOBRECENA: { service: 'SOBRECENA', label: 'Sobrecena', totalValue: 0, totalItems: 0, transactionCount: 0 },
    OTROS: { service: 'OTROS', label: 'Otros Servicios', totalValue: 0, totalItems: 0, transactionCount: 0 },
    grandTotalValue: 0,
    grandTotalItems: 0,
    totalTransactions: 0
  }

  const seenTransactionsByService = new Map<ServiceType, Set<number>>([
    ['DESAYUNO', new Set()],
    ['ALMUERZO', new Set()],
    ['CENA', new Set()],
    ['SOBRECENA', new Set()],
    ['OTROS', new Set()]
  ])
  const globalSeenTransactions = new Set<number>()

  for (const item of items) {
    const sType = item.serviceType || 'OTROS'
    const target = summary[sType] || summary.OTROS

    target.totalValue = Number((target.totalValue + item.totalValue).toFixed(2))
    target.totalItems = Number((target.totalItems + item.quantity).toFixed(2))

    if (!seenTransactionsByService.get(sType)!.has(item.transactionId)) {
      seenTransactionsByService.get(sType)!.add(item.transactionId)
      target.transactionCount++
    }

    if (!globalSeenTransactions.has(item.transactionId)) {
      globalSeenTransactions.add(item.transactionId)
    }

    summary.grandTotalValue = Number((summary.grandTotalValue + item.totalValue).toFixed(2))
    summary.grandTotalItems = Number((summary.grandTotalItems + item.quantity).toFixed(2))
  }

  summary.totalTransactions = globalSeenTransactions.size
  return summary
}

/**
 * Agrupa los consumos por cada comedor o cocina local.
 */
export function aggregateByKitchen(items: RawConsumptionDetail[]): KitchenServiceBreakdown[] {
  const map = new Map<number, KitchenServiceBreakdown>()

  for (const item of items) {
    if (!map.has(item.warehouseId)) {
      map.set(item.warehouseId, {
        warehouseId: item.warehouseId,
        warehouseName: item.warehouseName,
        totalValue: 0,
        totalItems: 0,
        services: {
          DESAYUNO: { value: 0, items: 0 },
          ALMUERZO: { value: 0, items: 0 },
          CENA: { value: 0, items: 0 },
          SOBRECENA: { value: 0, items: 0 },
          OTROS: { value: 0, items: 0 }
        }
      })
    }

    const kitchen = map.get(item.warehouseId)!
    const sType = item.serviceType || 'OTROS'

    kitchen.totalValue = Number((kitchen.totalValue + item.totalValue).toFixed(2))
    kitchen.totalItems = Number((kitchen.totalItems + item.quantity).toFixed(2))

    if (kitchen.services[sType]) {
      kitchen.services[sType].value = Number((kitchen.services[sType].value + item.totalValue).toFixed(2))
      kitchen.services[sType].items = Number((kitchen.services[sType].items + item.quantity).toFixed(2))
    }
  }

  return Array.from(map.values()).sort((a, b) => b.totalValue - a.totalValue)
}
