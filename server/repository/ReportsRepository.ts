import { prisma } from '../utils/prisma'

export class ReportsRepository {
  /**
   * Reporte 1: Valor del Inventario
   */
  async getInventoryValue(warehouseId?: number, categoryId?: number) {
    const whereClause: any = {}
    if (warehouseId) whereClause.warehouseId = warehouseId
    if (categoryId) whereClause.product = { categoryId }

    const stocks = await prisma.stock.findMany({
      where: whereClause,
      include: {
        warehouse: true,
        product: { include: { category: true, unit: true } }
      }
    })

    // [NUEVO] Opción B: Buscar el último precio registrado en cualquier transacción para cada producto
    const lastPrices = await prisma.transactionDetail.groupBy({
      by: ['productId'],
      _max: { id: true },
      where: { unitPrice: { gt: 0 } }
    })

    const detailIds = lastPrices.map(p => p._max.id).filter(id => id !== null) as number[]
    const priceDetails = await prisma.transactionDetail.findMany({
      where: { id: { in: detailIds } },
      select: { productId: true, unitPrice: true }
    })

    const priceMap = new Map<number, number>()
    for (const pd of priceDetails) {
      priceMap.set(pd.productId, Number(pd.unitPrice))
    }

    const valueByWarehouse = new Map<number, any>()
    let totalGlobalValue = 0

    for (const stock of stocks) {
      const qty = Number(stock.quantity)
      // Usamos el precio dinámico de la última transacción, si no hay, cae en 0
      const price = priceMap.get(stock.productId) || 0
      const value = qty * price

      totalGlobalValue += value

      if (!valueByWarehouse.has(stock.warehouseId)) {
        valueByWarehouse.set(stock.warehouseId, {
          warehouse: stock.warehouse,
          totalValue: 0,
          items: []
        })
      }

      const whData = valueByWarehouse.get(stock.warehouseId)
      whData.totalValue += value
      
      if (qty > 0) {
        whData.items.push({
          product: stock.product,
          quantity: qty,
          unitPrice: price,
          totalValue: value
        })
      }
    }

    const warehouses = Array.from(valueByWarehouse.values()).map(wh => {
      wh.items.sort((a: any, b: any) => b.totalValue - a.totalValue)
      return wh
    })

    return { totalGlobalValue, warehouses }
  }

  /**
   * Reporte 2: Alertas de Stop
   */
  async getStopAlerts(warehouseId?: number) {
    const stocks = await prisma.stock.findMany({
      where: warehouseId ? { warehouseId } : {},
      include: {
        warehouse: true,
        product: { include: { category: true, unit: true } }
      }
    })

    const alerts: any[] = []

    for (const stock of stocks) {
      const qty = Number(stock.quantity)
      const min = Number(stock.product.minimumStock)
      const max = stock.product.maximumStock ? Number(stock.product.maximumStock) : null

      if (qty <= 0) {
        alerts.push({
          id: `empty-${stock.id}`,
          type: 'CRITICAL',
          message: 'Stock Agotado',
          color: 'red-10',
          icon: 'warning',
          product: stock.product,
          warehouse: stock.warehouse,
          currentQty: qty,
          limit: min,
          priority: 1
        })
      } else if (qty < min) {
        alerts.push({
          id: `low-${stock.id}`,
          type: 'LOW',
          message: 'Por debajo del mínimo',
          color: 'orange-8',
          icon: 'trending_down',
          product: stock.product,
          warehouse: stock.warehouse,
          currentQty: qty,
          limit: min,
          priority: 2
        })
      } else if (max !== null && qty > max) {
        alerts.push({
          id: `excess-${stock.id}`,
          type: 'EXCESS',
          message: 'Exceso de stock',
          color: 'blue-8',
          icon: 'trending_up',
          product: stock.product,
          warehouse: stock.warehouse,
          currentQty: qty,
          limit: max,
          priority: 3
        })
      }
    }

    const today = new Date()
    const sevenDays = new Date(); sevenDays.setDate(sevenDays.getDate() + 7)
    const fourteenDays = new Date(); fourteenDays.setDate(fourteenDays.getDate() + 14)

    const incomingLots = await prisma.transactionDetail.findMany({
      where: {
        expirationDate: { not: null },
        transaction: { status: 'CONFIRMED', destinationId: warehouseId || undefined }
      },
      include: {
        product: { include: { unit: true } },
        transaction: { include: { destination: true } }
      }
    })

    const seenLots = new Set()
    for (const lot of incomingLots) {
      if (!lot.expirationDate || !lot.transaction.destination) continue
      
      const key = `${lot.productId}-${lot.transaction.destinationId}-${lot.expirationDate.toISOString()}`
      if (seenLots.has(key)) continue
      seenLots.add(key)

      const expDate = new Date(lot.expirationDate)
      
      if (expDate < today) {
        alerts.push({ id: `exp-${lot.id}`, type: 'EXPIRED', message: '¡PRODUCTO VENCIDO!', color: 'red-10', icon: 'sentiment_very_dissatisfied', product: lot.product, warehouse: lot.transaction.destination, currentQty: Number(lot.quantity), limit: expDate, priority: 0 })
      } else if (expDate <= sevenDays) {
        alerts.push({ id: `exp-${lot.id}`, type: 'EXPIRING_SOON', message: 'Vence en menos de 7 días', color: 'red-6', icon: 'event_busy', product: lot.product, warehouse: lot.transaction.destination, currentQty: Number(lot.quantity), limit: expDate, priority: 1 })
      } else if (expDate <= fourteenDays) {
        alerts.push({ id: `exp-${lot.id}`, type: 'EXPIRING_LATER', message: 'Vence en 1-2 semanas', color: 'orange-6', icon: 'event', product: lot.product, warehouse: lot.transaction.destination, currentQty: Number(lot.quantity), limit: expDate, priority: 2 })
      }
    }

    return alerts.sort((a, b) => a.priority - b.priority)
  }

  /**
   * Reporte 3: Mínimos y Máximos por Categoría
   */
  async getMinMaxStats(warehouseId?: number) {
    const categories = await prisma.category.findMany({ where: { active: true } })
    const stocks = await prisma.stock.findMany({
      where: warehouseId ? { warehouseId } : {},
      include: { product: { include: { category: true } } }
    })

    const statsMap = new Map()
    for (const cat of categories) {
      statsMap.set(cat.id, { id: cat.id, name: cat.name, belowMin: 0, inRange: 0, aboveMax: 0, totalItems: 0 })
    }

    const productStocks = new Map()
    for (const stock of stocks) {
      const pId = stock.productId
      if (!productStocks.has(pId)) productStocks.set(pId, { product: stock.product, totalQty: 0 })
      productStocks.get(pId).totalQty += Number(stock.quantity)
    }

    for (const item of productStocks.values()) {
      const qty = item.totalQty
      const min = Number(item.product.minimumStock)
      const max = item.product.maximumStock ? Number(item.product.maximumStock) : Infinity
      const catId = item.product.categoryId

      if (!statsMap.has(catId)) continue
      const stats = statsMap.get(catId)
      stats.totalItems++

      if (qty < min) stats.belowMin++
      else if (qty > max) stats.aboveMax++
      else stats.inRange++
    }

    return Array.from(statsMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  }

  /**
   * Reporte 4: Consumos y Mermas
   */
  async getConsumptions(warehouseId?: number, startDate?: Date, endDate?: Date) {
    const whereClause: any = {
      type: { in: ['CONSUMPTION', 'LOSS'] },
      status: 'CONFIRMED'
    }

    if (warehouseId) whereClause.sourceId = warehouseId
    if (startDate && endDate) whereClause.createdAt = { gte: startDate, lte: endDate }
    else if (startDate) whereClause.createdAt = { gte: startDate }
    else if (endDate) whereClause.createdAt = { lte: endDate }

    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      include: {
        source: true, createdBy: true, approvedBy: true,
        details: { include: { product: { include: { category: true, unit: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    })

    let totalConsumptionItems = 0
    let totalLossItems = 0
    let totalConsumptionValue = 0
    let totalLossValue = 0
    const items = []

    for (const tx of transactions) {
      for (const d of tx.details) {
        const qty = Number(d.quantity)
        const value = qty * Number(d.product.referencePrice || 0)

        if (tx.type === 'CONSUMPTION') {
          totalConsumptionItems += qty
          totalConsumptionValue += value
        }
        if (tx.type === 'LOSS') {
          totalLossItems += qty
          totalLossValue += value
        }

        items.push({
          id: tx.id, date: tx.createdAt, type: tx.type,
          warehouse: tx.source?.name, operator: tx.createdBy.name, approver: tx.approvedBy?.name,
          productName: d.product.name, productCode: d.product.code, category: d.product.category.name,
          quantity: qty, value: value, unit: d.product.unit.abbreviation, notes: tx.notes
        })
      }
    }

    return { totalConsumptionItems, totalLossItems, totalConsumptionValue, totalLossValue, details: items }
  }

  /**
   * Reporte 5: Apoyos Institucionales
   */
  async getInstitutionsSupport(warehouseId?: number, startDate?: Date, endDate?: Date) {
    const whereClause: any = { type: 'SUPPORT', status: 'CONFIRMED' }
    
    if (warehouseId) whereClause.sourceId = warehouseId

    if (startDate && endDate) whereClause.createdAt = { gte: startDate, lte: endDate }
    else if (startDate) whereClause.createdAt = { gte: startDate }
    else if (endDate) whereClause.createdAt = { lte: endDate }

    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      include: {
        institution: true, source: true,
        details: { include: { product: { include: { unit: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    })

    const summaryByType = new Map<string, { type: string, count: number, totalItems: number }>()
    const items = []

    for (const tx of transactions) {
      const instType = tx.institution?.type || 'No Definido'
      if (!summaryByType.has(instType)) summaryByType.set(instType, { type: instType, count: 0, totalItems: 0 })
      
      const summary = summaryByType.get(instType)!
      summary.count++

      let txItems = 0
      for (const d of tx.details) txItems += Number(d.quantity)
      summary.totalItems += txItems

      items.push({
        id: tx.id, date: tx.createdAt, warehouse: tx.source?.name,
        institutionName: tx.institution?.name, institutionType: instType, itemsCount: txItems,
        details: tx.details.map(d => ({ productName: d.product.name, quantity: Number(d.quantity), unit: d.product.unit.abbreviation }))
      })
    }

    return { summary: Array.from(summaryByType.values()), details: items }
  }
}
