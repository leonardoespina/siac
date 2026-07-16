<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const auth = useAuthStore()
</script>

<template>
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
          <q-item-section>Aprobación de Apoyos</q-item-section>
        </q-item>
      </q-list>
    </q-expansion-item>

    <!-- Menú Dinámico: Gestión de Comensales -->
    <q-expansion-item
      icon="groups"
      label="Gestión de Comensales"
      v-if="auth.isAuthenticated && (auth.hasPermission('DINERS', 'canRead') || auth.hasPermission('DISPATCH', 'canRead') || auth.hasPermission('DINERS_REQUESTS', 'canRead') || auth.hasPermission('MY_SQUADS', 'canRead'))"
    >
      <q-list class="q-pl-lg">
        <q-item clickable v-ripple to="/dispatch" active-class="text-primary" v-if="auth.hasPermission('DISPATCH', 'canRead')">
          <q-item-section avatar><q-icon name="touch_app" size="sm" /></q-item-section>
          <q-item-section>Punto de Despacho</q-item-section>
        </q-item>

        <q-item clickable v-ripple to="/diners/requests" active-class="text-primary" v-if="auth.hasPermission('DINERS_REQUESTS', 'canRead') || auth.hasPermission('DINERS_REQUESTS', 'canCreate')">
          <q-item-section avatar><q-icon name="restaurant_menu" size="sm" /></q-item-section>
          <q-item-section>Solicitar Comidas</q-item-section>
        </q-item>
        
        <q-item clickable v-ripple to="/diners/squads" active-class="text-primary" v-if="auth.hasPermission('MY_SQUADS', 'canRead')">
          <q-item-section avatar><q-icon name="engineering" size="sm" /></q-item-section>
          <q-item-section>Mis Cuadrillas</q-item-section>
        </q-item>
        
        <q-item clickable v-ripple to="/diners/workers" active-class="text-primary" v-if="auth.hasPermission('DINERS', 'canRead')">
          <q-item-section avatar><q-icon name="fingerprint" size="sm" /></q-item-section>
          <q-item-section>Comensales Físicos</q-item-section>
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
      v-if="auth.isAuthenticated && (auth.hasPermission('REPORT_DASHBOARD', 'canRead') || auth.hasPermission('REPORT_VALUE', 'canRead') || auth.hasPermission('REPORT_ALERTS', 'canRead') || auth.hasPermission('REPORT_MINMAX', 'canRead') || auth.hasPermission('REPORT_CONSUMPTIONS', 'canRead') || auth.hasPermission('REPORT_INSTITUTIONS', 'canRead') || auth.hasPermission('REPORT_SHIFTS', 'canRead') || auth.hasPermission('REPORT_RECEPTIONS', 'canRead'))"
    >
      <q-list class="q-pl-lg">
        <q-item clickable v-ripple to="/reports" active-class="text-primary" exact v-if="auth.hasPermission('REPORT_DASHBOARD', 'canRead')">
          <q-item-section avatar><q-icon name="dashboard" size="sm" /></q-item-section>
          <q-item-section>Dashboard de Reportes</q-item-section>
        </q-item>
        <q-item clickable v-ripple to="/reports/value" active-class="text-primary" v-if="auth.hasPermission('REPORT_VALUE', 'canRead')">
          <q-item-section avatar><q-icon name="request_quote" size="sm" /></q-item-section>
          <q-item-section>Valor del Inventario</q-item-section>
        </q-item>
        <q-item clickable v-ripple to="/reports/alerts" active-class="text-primary" v-if="auth.hasPermission('REPORT_ALERTS', 'canRead')">
          <q-item-section avatar><q-icon name="warning" size="sm" /></q-item-section>
          <q-item-section>Alertas de Stop</q-item-section>
        </q-item>
        <q-item clickable v-ripple to="/reports/minmax" active-class="text-primary" v-if="auth.hasPermission('REPORT_MINMAX', 'canRead')">
          <q-item-section avatar><q-icon name="bar_chart" size="sm" /></q-item-section>
          <q-item-section>Mínimos y Máximos</q-item-section>
        </q-item>
        <q-item clickable v-ripple to="/reports/consumptions" active-class="text-primary" v-if="auth.hasPermission('REPORT_CONSUMPTIONS', 'canRead')">
          <q-item-section avatar><q-icon name="restaurant" size="xs" /></q-item-section>
          <q-item-section>Consumos y Mermas</q-item-section>
        </q-item>
        <q-item clickable v-ripple to="/reports/evolution" active-class="text-primary" v-if="auth.hasPermission('REPORT_CONSUMPTIONS', 'canRead')">
          <q-item-section avatar><q-icon name="insert_chart" size="xs" /></q-item-section>
          <q-item-section>Evolución de Gasto</q-item-section>
        </q-item>
        <q-item clickable v-ripple to="/reports/institutions" active-class="text-primary" v-if="auth.hasPermission('REPORT_INSTITUTIONS', 'canRead')">
          <q-item-section avatar><q-icon name="volunteer_activism" size="sm" /></q-item-section>
          <q-item-section>Apoyos Institucionales</q-item-section>
        </q-item>
        <q-item clickable v-ripple to="/reports/shifts" active-class="text-primary" v-if="auth.hasPermission('REPORT_SHIFTS', 'canRead')">
          <q-item-section avatar><q-icon name="history" size="sm" /></q-item-section>
          <q-item-section>Historial de Turnos</q-item-section>
        </q-item>
        <q-item clickable v-ripple to="/reports/receptions" active-class="text-primary" v-if="auth.hasPermission('REPORT_RECEPTIONS', 'canRead')">
          <q-item-section avatar><q-icon name="table_chart" size="sm" /></q-item-section>
          <q-item-section>Matriz de Recepciones</q-item-section>
        </q-item>
      </q-list>
    </q-expansion-item>

    <!-- Menú Dinámico: Seguridad y Estructura Organizacional -->
    <q-expansion-item
      icon="security"
      label="Seguridad"
      v-if="auth.isAuthenticated && (auth.hasPermission('SECURITY', 'canRead') || auth.hasPermission('BIOMETRIC', 'canRead') || auth.hasPermission('DINING_ROOMS', 'canRead') || auth.hasPermission('SQUADS', 'canRead') || auth.hasPermission('DEPENDENCIES', 'canRead') || auth.hasPermission('POSITIONS', 'canRead') || auth.hasPermission('AUDIT', 'canRead'))"
    >
      <q-list class="q-pl-lg">
        <!-- Catálogos Organizacionales -->
        <q-item clickable v-ripple to="/diners/dining-rooms" active-class="text-primary" v-if="auth.hasPermission('DINING_ROOMS', 'canRead')">
          <q-item-section avatar><q-icon name="restaurant" size="sm" /></q-item-section>
          <q-item-section>Gestión de Comedores</q-item-section>
        </q-item>

        <q-item clickable v-ripple to="/diners/squad-catalog" active-class="text-primary" v-if="auth.hasPermission('SQUADS', 'canCreate') || auth.hasPermission('SQUADS', 'canRead')">
          <q-item-section avatar><q-icon name="list_alt" size="sm" /></q-item-section>
          <q-item-section>Catálogo de Cuadrillas</q-item-section>
        </q-item>

        <q-item clickable v-ripple to="/diners/positions" active-class="text-primary" v-if="auth.hasPermission('POSITIONS', 'canRead')">
          <q-item-section avatar><q-icon name="badge" size="sm" /></q-item-section>
          <q-item-section>Catálogo de Cargos</q-item-section>
        </q-item>

        <q-item clickable v-ripple to="/diners/dependencies" active-class="text-primary" v-if="auth.hasPermission('DEPENDENCIES', 'canRead')">
          <q-item-section avatar><q-icon name="account_tree" size="sm" /></q-item-section>
          <q-item-section>Árbol Organizacional</q-item-section>
        </q-item>

        <q-separator class="q-my-sm" />

        <!-- Módulos Core de Seguridad -->
        <q-item clickable v-ripple to="/security/biometric" active-class="text-primary" v-if="auth.hasPermission('BIOMETRIC', 'canRead')">
          <q-item-section avatar><q-icon name="fingerprint" size="sm" /></q-item-section>
          <q-item-section>Gestión Biométrica</q-item-section>
        </q-item>
        <q-item clickable v-ripple to="/security/users" active-class="text-primary" v-if="auth.hasPermission('SECURITY', 'canRead')">
          <q-item-section avatar><q-icon name="manage_accounts" size="sm" /></q-item-section>
          <q-item-section>Usuarios</q-item-section>
        </q-item>
        <q-item clickable v-ripple to="/security/roles" active-class="text-primary" v-if="auth.hasPermission('SECURITY', 'canRead')">
          <q-item-section avatar><q-icon name="admin_panel_settings" size="sm" /></q-item-section>
          <q-item-section>Roles y Permisos</q-item-section>
        </q-item>
        <q-item clickable v-ripple to="/security/audit" active-class="text-primary" v-if="auth.hasPermission('AUDIT', 'canRead')">
          <q-item-section avatar><q-icon name="history" size="sm" /></q-item-section>
          <q-item-section>Auditoría</q-item-section>
        </q-item>
      </q-list>
    </q-expansion-item>
  </q-list>
</template>
