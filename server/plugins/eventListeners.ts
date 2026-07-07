import { eventBus } from '../utils/eventBus'
import { prisma } from '../utils/prisma'
import { io } from './socket'

export default defineNitroPlugin((nitroApp) => {
  console.log('🎧 Inicializando Event Listeners para WebSockets...')
  
  // Prevenir duplicación de eventos durante Hot Module Replacement (HMR) en desarrollo
  eventBus.all.clear()

  // 1. Escuchar cuando se crea una transferencia (Despacho a Comedor)
  eventBus.on('transfer:created', async (payload) => {
    try {
      // Buscar a los usuarios que pertenezcan al almacén destino (Comedor Local)
      const destinationUsers = await prisma.user.findMany({
        where: { 
          warehouseId: payload.destinationId, 
          active: true,
          role: {
            permissions: {
              some: {
                OR: [
                  { module: { code: 'RECEPTIONS' }, canCreate: true },
                  { module: { code: 'OPERATIONS' }, canRead: true }
                ]
              }
            }
          }
        }
      })

      for (const user of destinationUsers) {
        // Guardar notificación en BD
        const notif = await prisma.notification.create({
          data: {
            userId: user.id,
            title: 'Nuevo Despacho en Puerta',
            message: `Tienes una nueva transferencia #${payload.id} esperando recepción.`,
            link: '/kitchen/operation'
          }
        })
        // Emitir por Socket.io a la sala personal del usuario
        if (io) {
          io.to(`user_${user.id}`).emit('notification', notif)
        }
      }
    } catch (e) {
      console.error('Error procesando evento transfer:created', e)
    }
  })

  // 2. Escuchar cuando un operador local envía un consumo a PENDIENTE
  eventBus.on('transfer:status_changed', async (payload) => {
    try {
      if (payload.status === 'PENDING') {
        // Obtener el tipo de transacción para saber a quién notificar y a dónde redirigir
        const tx = await prisma.transaction.findUnique({
          where: { id: payload.id },
          select: { type: true, shiftId: true }
        })

        let requiredModule = 'OPERATIONS'
        let targetLink = '/inventory/approvals'

        if (tx?.type === 'TRANSFER') {
          requiredModule = 'APPROVAL_TRANSFERS'
          targetLink = `/inventory/transfers/${payload.id}`
        } else if (tx?.type === 'RECEPTION') {
          requiredModule = 'APPROVAL_RECEPTIONS'
          targetLink = `/inventory/receptions/${payload.id}`
        }

        // Buscar a los administradores y gerentes para notificarles
        const managers = await prisma.user.findMany({
          where: {
            active: true,
            role: {
              permissions: {
                some: {
                  OR: [
                    { module: { code: requiredModule }, canUpdate: true },
                    { module: { code: 'GLOBAL_ACCESS' }, canRead: true }
                  ]
                }
              }
            }
          }
        })
        
        // Título de la notificación adaptativo
        let notifTitle = 'Aprobación Requerida'
        let notifMessage = `La transacción #${payload.id} requiere tu aprobación.`
        
        if (tx?.type === 'LOSS' && !tx.shiftId) {
          notifTitle = '🚨 CRÍTICO: Merma Extra-Turno'
          notifMessage = `Merma extraordinaria registrada fuera de horario (ID #${payload.id}). Revise urgente.`
        } else if (tx?.type === 'SUPPORT' && !tx.shiftId) {
          notifTitle = '🚨 Apoyo Extra-Turno'
          notifMessage = `Apoyo institucional registrado fuera de horario (ID #${payload.id}).`
        }

        for (const manager of managers) {
          const notif = await prisma.notification.create({
            data: {
              userId: manager.id,
              title: notifTitle,
              message: notifMessage,
              link: targetLink
            }
          })
          if (io) {
            io.to(`user_${manager.id}`).emit('notification', notif)
          }
        }
      } else if (payload.status === 'APPROVED' || payload.status === 'REJECTED') {
        const tx = await prisma.transaction.findUnique({
          where: { id: payload.id },
          select: { createdById: true, destinationId: true, type: true }
        })
        
        if (tx) {
          // Notificar al creador original (Feedback al Cocinero o Almacenista)
          const creatorNotif = await prisma.notification.create({
            data: {
              userId: tx.createdById,
              title: payload.status === 'APPROVED' ? 'Aprobado' : 'Rechazado',
              message: `Tu solicitud #${payload.id} ha sido ${payload.status === 'APPROVED' ? 'aprobada' : 'rechazada'}.`,
              link: '/kitchen/operation'
            }
          })
          if (io) io.to(`user_${tx.createdById}`).emit('notification', creatorNotif)

          // Si es APPROVED y tiene destino (ej: Recepción o Transferencia), notificar al almacén destino para que "Confirmen Ingreso"
          if (payload.status === 'APPROVED' && tx.destinationId) {
             const destinationUsers = await prisma.user.findMany({
               where: { 
                 warehouseId: tx.destinationId, 
                 active: true,
                 role: {
                   permissions: {
                     some: {
                       OR: [
                         { module: { code: 'RECEPTIONS' }, canCreate: true },
                         { module: { code: 'OPERATIONS' }, canRead: true }
                       ]
                     }
                   }
                 }
               }
             })
             
             let destLink = '/inventory/transfers'
             if (tx.type === 'RECEPTION') destLink = '/inventory/receptions'
             
             for (const u of destinationUsers) {
                const destNotif = await prisma.notification.create({
                  data: {
                    userId: u.id,
                    title: 'Mercancía Aprobada',
                    message: `La transacción #${payload.id} ha sido aprobada y está en camino o lista para que confirmes el ingreso.`,
                    link: destLink
                  }
                })
                if (io) io.to(`user_${u.id}`).emit('notification', destNotif)
             }
          }
        }
      }
    } catch (e) {
      console.error('Error procesando evento transfer:status_changed', e)
    }
  })

  // 3. Escuchar Alertas de Stock Mínimo
  eventBus.on('stock:below-minimum', async (payload) => {
    try {
      // Buscar a los administradores/gerentes Y a los usuarios del almacén afectado
      const targetUsers = await prisma.user.findMany({
        where: {
          active: true,
          OR: [
            {
              role: {
                permissions: {
                  some: {
                    OR: [
                      { module: { code: 'REPORT_ALERTS' }, canRead: true },
                      { module: { code: 'GLOBAL_ACCESS' }, canRead: true }
                    ]
                  }
                }
              }
            },
            {
              warehouseId: payload.warehouseId,
              role: {
                permissions: {
                  some: {
                    module: { code: { in: ['OPERATIONS', 'PRODUCTS'] } },
                    canRead: true
                  }
                }
              }
            }
          ]
        }
      })

      const [warehouse, product] = await Promise.all([
        prisma.warehouse.findUnique({ where: { id: payload.warehouseId } }),
        prisma.product.findUnique({ where: { id: payload.productId } })
      ])

      const whName = warehouse?.name || `ID ${payload.warehouseId}`
      const prName = product?.name || `ID ${payload.productId}`

      for (const user of targetUsers) {
        const notif = await prisma.notification.create({
          data: {
            userId: user.id,
            title: 'Alerta de Stock Crítico',
            message: `El producto ${prName} en ${whName} cayó a ${payload.currentQuantity} (Mínimo: ${payload.minimumQuantity}).`,
            link: '/inventory/products'
          }
        })
        if (io) io.to(`user_${user.id}`).emit('notification', notif)
      }
    } catch (e) {
      console.error('Error procesando evento stock:below-minimum', e)
    }
  })

  // 4. Escuchar actualización general de inventario para reactividad
  eventBus.on('inventory:updated', (payload) => {
    if (io) {
      // Emitir al comedor específico
      io.to(`warehouse_${payload.warehouseId}`).emit('inventory:update_row', payload)
      // Emitir a los administradores globales
      io.to(`global_inventory`).emit('inventory:update_row', payload)
    }
  })

  // 5. Sincronización en tiempo real de Comensales
  eventBus.on('diner:created', (payload) => {
    if (io) io.emit('diner:sync', { action: 'create', diner: payload.diner })
  })
  
  eventBus.on('diner:updated', (payload) => {
    if (io) io.emit('diner:sync', { action: 'update', diner: payload.diner })
  })

  eventBus.on('diner:deleted', (payload) => {
    if (io) io.emit('diner:sync', { action: 'delete', diner: { id: payload.id } })
  })
})
