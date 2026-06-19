<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '~/stores/auth'
import { useNotificationsStore, type Notification } from '~/stores/notifications'
import { useInteractiveTour } from '~/composables/features/useInteractiveTour'
import { useQuasar } from 'quasar'

// ── LAYOUT BASE DE QUASAR ───────────────────────────────────────────────────
const leftDrawerOpen = ref(true)
const auth = useAuthStore()
const notifications = useNotificationsStore()
const interactiveTour = useInteractiveTour()
const router = useRouter()
const $q = useQuasar()
const { $socket } = useNuxtApp() as any

const isPasswordDialogOpen = ref(false)
const changingPassword = ref(false)
const passwordForm = ref({ old: '', new: '', confirm: '' })

// Inicializar sockets y notificaciones si está logueado
onMounted(() => {
  if (auth.isAuthenticated && auth.user) {
    notifications.fetchAll()
    $socket.emit('join', auth.user.id)
    interactiveTour.checkAndOpenTour()
    
    // Escuchar notificaciones en vivo
    $socket.on('notification', (newNotif: Notification) => {
      notifications.addRealtimeNotification(newNotif)
      $q.notify({
        type: 'info',
        message: newNotif.title,
        caption: newNotif.message,
        actions: [{ icon: 'close', color: 'white' }]
      })
    })
  }
})

// Volver a enlazar si el usuario hace login sin recargar F5
watch(() => auth.isAuthenticated, (newVal) => {
  if (newVal && auth.user) {
    notifications.fetchAll()
    $socket.emit('join', auth.user.id)
    interactiveTour.checkAndOpenTour()
  }
})

const handleNotificationClick = async (n: Notification) => {
  if (!n.isRead) {
    await notifications.markAsRead(n.id)
  }
  if (n.link) {
    router.push(n.link)
  }
}

const submitPasswordChange = async () => {
  changingPassword.value = true
  try {
    await auth.changePassword(passwordForm.value.old, passwordForm.value.new)
    $q.notify({ type: 'positive', message: 'Contraseña actualizada. Úsala la próxima vez.' })
    isPasswordDialogOpen.value = false
    passwordForm.value = { old: '', new: '', confirm: '' }
  } catch (error: any) {
    $q.notify({ type: 'negative', message: error.data?.message || 'Error al cambiar clave' })
  } finally {
    changingPassword.value = false
  }
}
</script>

<template>
  <!-- lHh Lpr lFf es el modelo de layout por defecto de Quasar -->
  <q-layout view="lHh Lpr lFf">
    
    <!-- HEADER -->
    <q-header elevated class="bg-primary">
      <q-toolbar>
        <q-btn
          flat dense round
          icon="menu"
          @click="leftDrawerOpen = !leftDrawerOpen"
        />
        <q-toolbar-title>SIAC</q-toolbar-title>

        <!-- INFO DEL USUARIO LOGUEADO -->
        <div v-if="auth.isAuthenticated" class="row items-center q-gutter-md">

          <!-- BOTÓN DE AYUDA / TOUR -->
          <q-btn flat round dense icon="help_outline" @click="interactiveTour.openTour()">
            <q-tooltip>Ver Guía Rápida</q-tooltip>
          </q-btn>
          
          <!-- CAMPANITA DE NOTIFICACIONES -->
          <q-btn flat round dense icon="notifications">
            <q-badge v-if="notifications.unreadCount > 0" color="red" floating rounded>
              {{ notifications.unreadCount }}
            </q-badge>
            <q-menu fit>
              <q-list style="min-width: 250px">
                <q-item-label header>Notificaciones</q-item-label>
                
                <q-item v-if="notifications.notifications.length === 0">
                  <q-item-section class="text-grey">Sin notificaciones nuevas</q-item-section>
                </q-item>

                <q-item 
                  v-for="n in notifications.notifications" 
                  :key="n.id" 
                  clickable 
                  v-ripple
                  :class="n.isRead ? '' : 'bg-blue-1'"
                  @click="handleNotificationClick(n)"
                >
                  <q-item-section>
                    <q-item-label :class="n.isRead ? '' : 'text-weight-bold'">{{ n.title }}</q-item-label>
                    <q-item-label caption lines="2">{{ n.message }}</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </q-btn>

          <!-- MENÚ DE USUARIO -->
          <q-btn flat dense no-caps>
            <div class="row items-center">
              <div v-if="$q.screen.gt.xs" class="column text-right q-pr-sm">
                <span class="text-weight-bold ellipsis" style="font-size: 14px; max-width: 150px;">{{ auth.user?.name }}</span>
                <span class="text-caption ellipsis" style="line-height: 1; max-width: 150px;">{{ auth.user?.role?.name }}</span>
              </div>
              <q-avatar v-else size="sm" color="blue-9" text-color="white" class="q-mr-xs">
                {{ auth.user?.name?.charAt(0)?.toUpperCase() || 'U' }}
              </q-avatar>
              <q-icon name="arrow_drop_down" />
            </div>

            <q-menu fit>
              <q-list style="min-width: 150px">
                <q-item clickable v-close-popup @click="isPasswordDialogOpen = true">
                  <q-item-section avatar><q-icon name="key" size="sm" /></q-item-section>
                  <q-item-section>Cambiar Clave</q-item-section>
                </q-item>
                <q-separator />
                <q-item clickable v-close-popup @click="auth.logout()">
                  <q-item-section avatar><q-icon name="logout" color="negative" size="sm" /></q-item-section>
                  <q-item-section class="text-negative">Cerrar Sesión</q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </q-btn>
        </div>
      </q-toolbar>
    </q-header>

    <!-- SIDEBAR (MENÚ LATERAL) -->
    <q-drawer v-model="leftDrawerOpen" show-if-above bordered>
      <q-list>
        <q-item-label header>Navegación</q-item-label>
        
        <!-- Enlace al Dashboard -->
        <q-item clickable to="/">
          <q-item-section avatar>
            <q-icon name="dashboard" />
          </q-item-section>
          <q-item-section>Dashboard</q-item-section>
        </q-item>
        
        <q-item to="/inventory/receptions" clickable v-ripple v-if="auth.hasPermission('RECEPTIONS', 'canRead')">
          <q-item-section avatar>
            <q-icon name="inventory_2" />
          </q-item-section>
          <q-item-section>Recepciones</q-item-section>
        </q-item>

        <q-item to="/inventory/transfers" clickable v-ripple v-if="auth.hasPermission('TRANSFERS', 'canRead')">
          <q-item-section avatar>
            <q-icon name="local_shipping" />
          </q-item-section>
          <q-item-section>Transferencias (Cocinas)</q-item-section>
        </q-item>

        <q-separator class="q-my-md" />

        <!-- Aquí iremos agregando los demás menús (Productos, etc) a medida -->
        <!-- que desarrollemos los módulos contigo. -->

          <!-- Menú Dinámico: Inventario -->
          <q-expansion-item
            icon="inventory_2"
            label="Inventario"
            v-if="auth.isAuthenticated && (auth.hasPermission('PRODUCTS', 'canRead') || auth.hasPermission('CATEGORIES', 'canRead') || auth.hasPermission('WAREHOUSES', 'canRead') || auth.hasPermission('UNITS', 'canRead') || auth.hasPermission('SUPPLIERS', 'canRead'))"
          >
            <q-list class="q-pl-lg">
              <q-item clickable v-ripple to="/inventory/products" active-class="text-primary" v-if="auth.hasPermission('PRODUCTS', 'canRead')">
                <q-item-section avatar><q-icon name="shopping_basket" size="sm" /></q-item-section>
                <q-item-section>Productos</q-item-section>
              </q-item>
              <q-item clickable v-ripple to="/inventory/categories" active-class="text-primary" v-if="auth.hasPermission('CATEGORIES', 'canRead')">
                <q-item-section avatar><q-icon name="category" size="sm" /></q-item-section>
                <q-item-section>Categorías</q-item-section>
              </q-item>
              <q-item clickable v-ripple to="/inventory/units" active-class="text-primary" v-if="auth.hasPermission('UNITS', 'canRead')">
                <q-item-section avatar><q-icon name="straighten" size="sm" /></q-item-section>
                <q-item-section>Unidades</q-item-section>
              </q-item>
              <q-item clickable v-ripple to="/inventory/warehouses" active-class="text-primary" v-if="auth.hasPermission('WAREHOUSES', 'canRead')">
                <q-item-section avatar><q-icon name="storefront" size="sm" /></q-item-section>
                <q-item-section>Almacenes</q-item-section>
              </q-item>
              <q-item clickable v-ripple to="/inventory/suppliers" active-class="text-primary" v-if="auth.hasPermission('SUPPLIERS', 'canRead')">
                <q-item-section avatar><q-icon name="business" size="sm" /></q-item-section>
                <q-item-section>Proveedores</q-item-section>
              </q-item>
              <q-item clickable v-ripple to="/inventory/institutions" active-class="text-primary" v-if="auth.hasPermission('INSTITUTIONS', 'canRead')">
                <q-item-section avatar><q-icon name="account_balance" size="sm" /></q-item-section>
                <q-item-section>Instituciones (Apoyos)</q-item-section>
              </q-item>
              <q-item clickable v-ripple to="/inventory/approvals" active-class="text-primary" v-if="auth.hasPermission('OPERATIONS', 'canUpdate')">
                <q-item-section avatar><q-icon name="fact_check" size="sm" /></q-item-section>
                <q-item-section>Aprobación de Consumos</q-item-section>
              </q-item>
            </q-list>
          </q-expansion-item>

          <!-- Menú Dinámico: Operación Local -->
          <q-expansion-item
            icon="restaurant"
            label="Cocina / Operación Local"
            v-if="auth.isAuthenticated && auth.hasPermission('OPERATIONS', 'canRead')"
          >
            <q-list class="q-pl-lg">
              <q-item clickable v-ripple to="/kitchen/operation" active-class="text-primary">
                <q-item-section avatar><q-icon name="point_of_sale" size="sm" /></q-item-section>
                <q-item-section>Panel de Operaciones</q-item-section>
              </q-item>
              <q-item clickable v-ripple to="/kitchen/inventory" active-class="text-primary">
                <q-item-section avatar><q-icon name="inventory" size="sm" /></q-item-section>
                <q-item-section>Mi Inventario Físico</q-item-section>
              </q-item>
              <q-item clickable v-ripple to="/kitchen/shifts" active-class="text-primary">
                <q-item-section avatar><q-icon name="history" size="sm" /></q-item-section>
                <q-item-section>Mi Historial de Turnos</q-item-section>
              </q-item>
            </q-list>
          </q-expansion-item>

          <!-- Menú Dinámico: Reportes -->
          <q-expansion-item
            icon="analytics"
            label="Reportes"
            v-if="auth.isAuthenticated && auth.hasPermission('REPORTS', 'canRead')"
          >
            <q-list class="q-pl-lg">
              <q-item clickable v-ripple to="/reports" active-class="text-primary" exact>
                <q-item-section avatar><q-icon name="dashboard" size="sm" /></q-item-section>
                <q-item-section>Dashboard de Reportes</q-item-section>
              </q-item>
              <q-item clickable v-ripple to="/reports/value" active-class="text-primary">
                <q-item-section avatar><q-icon name="request_quote" size="sm" /></q-item-section>
                <q-item-section>Valor del Inventario</q-item-section>
              </q-item>
              <q-item clickable v-ripple to="/reports/alerts" active-class="text-primary">
                <q-item-section avatar><q-icon name="warning" size="sm" /></q-item-section>
                <q-item-section>Alertas de Stop</q-item-section>
              </q-item>
              <q-item clickable v-ripple to="/reports/minmax" active-class="text-primary">
                <q-item-section avatar><q-icon name="bar_chart" size="sm" /></q-item-section>
                <q-item-section>Mínimos y Máximos</q-item-section>
              </q-item>
              <q-item clickable v-ripple to="/reports/consumptions" active-class="text-primary">
                <q-item-section avatar><q-icon name="restaurant" size="sm" /></q-item-section>
                <q-item-section>Consumos y Mermas</q-item-section>
              </q-item>
              <q-item clickable v-ripple to="/reports/institutions" active-class="text-primary">
                <q-item-section avatar><q-icon name="volunteer_activism" size="sm" /></q-item-section>
                <q-item-section>Apoyos Institucionales</q-item-section>
              </q-item>
              <q-item clickable v-ripple to="/reports/shifts" active-class="text-primary">
                <q-item-section avatar><q-icon name="history" size="sm" /></q-item-section>
                <q-item-section>Historial de Turnos</q-item-section>
              </q-item>
            </q-list>
          </q-expansion-item>

          <!-- Menú Dinámico: Seguridad -->
          <q-expansion-item
            icon="security"
            label="Seguridad"
            v-if="auth.isAuthenticated && auth.hasPermission('SECURITY', 'canRead')"
          >
            <q-list class="q-pl-lg">
              <q-item clickable v-ripple to="/security/users" active-class="text-primary">
                <q-item-section avatar><q-icon name="manage_accounts" size="sm" /></q-item-section>
                <q-item-section>Usuarios</q-item-section>
              </q-item>
              <q-item clickable v-ripple to="/security/roles" active-class="text-primary">
                <q-item-section avatar><q-icon name="admin_panel_settings" size="sm" /></q-item-section>
                <q-item-section>Roles y Permisos</q-item-section>
              </q-item>
              <q-item clickable v-ripple to="/security/audit" active-class="text-primary">
                <q-item-section avatar><q-icon name="history" size="sm" /></q-item-section>
                <q-item-section>Auditoría</q-item-section>
              </q-item>
            </q-list>
          </q-expansion-item>

      </q-list>
    </q-drawer>

    <!-- CONTENEDOR DE LA PÁGINA (aquí entra pages/index.vue, etc) -->
    <q-page-container>
      <NuxtPage />
    </q-page-container>

    <!-- MODAL CAMBIAR CONTRASEÑA -->
    <SharedFormDialog
      v-model="isPasswordDialogOpen"
      title="Cambiar Contraseña"
      :loading="changingPassword"
      save-label="Actualizar"
      @save="submitPasswordChange"
    >
      <q-input
        v-model="passwordForm.old"
        label="Contraseña Actual *"
        type="password"
        outlined dense autofocus
        :rules="[val => !!val || 'Requerida']"
      />
      <q-input
        v-model="passwordForm.new"
        label="Nueva Contraseña *"
        type="password"
        outlined dense class="q-mt-md"
        :rules="[val => val.length >= 6 || 'Mínimo 6 caracteres']"
      />
      <q-input
        v-model="passwordForm.confirm"
        label="Confirmar Nueva Contraseña *"
        type="password"
        outlined dense class="q-mt-md"
        :rules="[
          val => !!val || 'Requerida',
          val => val === passwordForm.new || 'Las contraseñas no coinciden'
        ]"
      />
    </SharedFormDialog>

    <!-- GUÍA INTERACTIVA (ONBOARDING) -->
    <SharedInteractiveTour />

  </q-layout>
</template>
