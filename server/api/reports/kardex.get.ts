import { defineApiHandler } from '../../utils/handler'
import { prisma } from '../../utils/prisma'
import { ValidationError } from '../../domain/errors'
import { requirePermission } from '../../utils/auth'

export default defineApiHandler(async (event) => {
  await requirePermission(event, 'PRODUCTS', 'read')
  const query = getQuery(event)
  const productId = parseInt(query.productId as string)
  
  if (!productId) throw new ValidationError('El ID del producto es requerido')

  // Obtener todas las transacciones donde este producto estuvo involucrado,
  // y que estén confirmadas (o aprobadas/enviadas según regla de negocio)
  const details = await prisma.transactionDetail.findMany({
    where: {
      productId,
      transaction: {
        status: { in: ['CONFIRMED', 'APPROVED'] } // TODO LO CONFIRMADO O ENVIADO
      }
    },
    include: {
      transaction: {
        include: {
          source: true,
          destination: true,
          supplier: true,
          createdBy: { select: { name: true } },
          approvedBy: { select: { name: true } }
        }
      }
    },
    orderBy: {
      transaction: { updatedAt: 'desc' }
    }
  })

  // Mapear al formato plano que espera el frontend
  return details.map(d => {
    const tx = d.transaction
    let typeLabel = ''
    let sourceLabel = ''
    let destLabel = ''
    let qty = Number(d.quantity)
    let isEntry = true

    if (tx.type === 'RECEPTION') {
      typeLabel = 'Entrada (Compra)'
      sourceLabel = tx.supplier?.name || 'Proveedor'
      destLabel = tx.destination?.name || 'Almacén Central'
      isEntry = true
    } else if (tx.type === 'TRANSFER') {
      typeLabel = 'Salida (Transferencia)'
      sourceLabel = tx.source?.name || 'Almacén Central'
      destLabel = tx.destination?.name || 'Cocina Local'
      isEntry = false
    } else if (tx.type === 'CONSUMPTION') {
      typeLabel = 'Salida (Consumo)'
      sourceLabel = tx.source?.name || 'Cocina Local'
      destLabel = 'Consumo Diario'
      isEntry = false
    } else if (tx.type === 'LOSS') {
      typeLabel = 'Salida (Merma)'
      sourceLabel = tx.source?.name || 'Almacén/Cocina'
      destLabel = 'Baja por Merma'
      isEntry = false
    } else if (tx.type === 'SUPPORT') {
      typeLabel = 'Salida (Apoyo)'
      sourceLabel = tx.source?.name || 'Almacén/Cocina'
      destLabel = tx.institution?.name || 'Apoyo Institucional'
      isEntry = false
    } else if (tx.type === 'ADJUSTMENT') {
      typeLabel = 'Ajuste de Inventario'
      sourceLabel = tx.source?.name || 'Almacén/Cocina'
      destLabel = 'Ajuste Manual'
      isEntry = qty >= 0
    }

    return {
      id: d.id,
      transactionId: tx.id,
      date: tx.updatedAt,
      status: tx.status,
      type: typeLabel,
      source: sourceLabel,
      destination: destLabel,
      quantity: isEntry ? qty : -qty,
      unitPrice: Number(d.unitPrice),
      user: tx.approvedBy?.name || tx.createdBy?.name
    }
  })
})
