import { useQuasar } from 'quasar'
import { useNotificationsStore, type Notification } from '~/stores/notifications'
import { useProductsStore } from '~/stores/products'
import { useDinersStore } from '~/stores/diners'
import { useAuthStore } from '~/stores/auth'

export function useAppSockets() {
  const $q = useQuasar()
  const { $socket } = useNuxtApp() as any
  const notifications = useNotificationsStore()
  const productStore = useProductsStore()
  const auth = useAuthStore()
  
  // Cola para el debouncer de alertas de stock masivas
  let pendingAlerts: Notification[] = []
  let alertTimeout: any = null

  const initSockets = () => {
    if (!auth.isAuthenticated || !auth.user) return

    // Unirse a las salas del usuario
    $socket.emit('join', { userId: auth.user.id, warehouseId: auth.user.warehouseId })

    // 1. Escuchar notificaciones en vivo
    $socket.off('notification')
    $socket.on('notification', (newNotif: Notification) => {
      notifications.addRealtimeNotification(newNotif)
      
      const isCritical = newNotif.title.includes('Alerta') || newNotif.title.includes('Crítico')
      
      if (isCritical) {
        pendingAlerts.push(newNotif)
        
        if (alertTimeout) clearTimeout(alertTimeout)
        
        // Ventana de agrupación de 500ms
        alertTimeout = setTimeout(() => {
          if (pendingAlerts.length === 1) {
            $q.notify({
              type: 'negative',
              message: pendingAlerts[0].title,
              caption: pendingAlerts[0].message,
              position: 'top-right',
              timeout: 5000
            })
          } else if (pendingAlerts.length > 1) {
            $q.notify({
              type: 'negative',
              message: `¡Atención! ${pendingAlerts.length} alertas de stock detectadas`,
              caption: 'Se han alcanzado los niveles críticos en múltiples productos simultáneamente. Revisa el centro de notificaciones.',
              position: 'top-right',
              timeout: 7000,
              icon: 'warning'
            })
          }
          pendingAlerts = []
        }, 500)
      } else {
        $q.notify({
          type: 'info',
          message: newNotif.title,
          caption: newNotif.message,
          position: 'top-right',
          timeout: 5000
        })
      }
    })
    
    // 2. Escuchar actualizaciones de inventario en vivo (Reactividad)
    $socket.off('inventory:update_row')
    $socket.on('inventory:update_row', (payload: { warehouseId: number, productId: number, quantity: string|number }) => {
      productStore.updateProductStock(payload.productId, payload.warehouseId, payload.quantity)
    })

    // 3. Escuchar actualizaciones de comensales en vivo
    $socket.off('diner:sync')
    $socket.on('diner:sync', (payload: { action: 'create' | 'update' | 'delete', diner: any }) => {
      const dinersStore = useDinersStore()
      dinersStore.syncDiner(payload.action, payload.diner)
    })
  }

  return {
    initSockets
  }
}
