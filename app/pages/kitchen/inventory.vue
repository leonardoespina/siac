<template>
  <q-page padding>
    <!-- Acceso Denegado / Sin Almacén -->
    <div v-if="!loading && !hasAssignedWarehouse && !isGlobalUser" class="row justify-center q-pa-xl">
      <q-banner class="bg-negative text-white rounded-borders" style="max-width: 600px">
        <template v-slot:avatar>
          <q-icon name="warning" />
        </template>
        <div class="text-h6">Acceso Denegado</div>
        <div>No tienes un comedor/almacén local asignado a tu perfil de usuario. Contacta al administrador.</div>
      </q-banner>
    </div>

    <!-- Pantalla Principal -->
    <div v-else>
      <div class="row items-center justify-between q-mb-md">
        <div class="text-h4 text-weight-bold text-primary">
          <q-icon name="inventory" class="q-mr-sm" /> Mi Inventario Local
        </div>
        
        <!-- Selector Administrador Global -->
        <div v-if="isGlobalUser" style="min-width: 300px;">
          <q-select
            v-model="activeWarehouseId"
            :options="warehouses"
            option-value="id"
            option-label="name"
            label="Ver Inventario del Comedor"
            outlined
            dense
            emit-value
            map-options
            bg-color="amber-1"
            label-color="amber-9"
          >
            <template v-slot:prepend>
              <q-icon name="admin_panel_settings" color="amber-9" />
            </template>
          </q-select>
        </div>
      </div>

      <div v-if="isGlobalUser && !hasAssignedWarehouse" class="row justify-center q-pa-xl text-center">
        <div class="text-h5 text-grey-6">
          <q-icon name="touch_app" size="64px" color="grey-4" class="q-mb-md block" style="margin: 0 auto" />
          Selecciona un comedor en la parte superior para visualizar su inventario.
        </div>
      </div>

      <div v-else>

      <!-- Filtros -->
      <q-card flat bordered class="q-mb-md">
        <q-card-section class="row q-col-gutter-md items-center">
          <div class="col-12 col-md-4">
            <q-input v-model="searchQuery" outlined dense placeholder="Buscar producto, código o categoría..." clearable>
              <template v-slot:append>
                <q-icon name="search" />
              </template>
            </q-input>
          </div>
          <div class="col-12 col-md-4">
            <q-toggle v-model="hideOutOfStock" color="primary" label="Ocultar productos agotados" />
          </div>
          <div class="col-12 col-md-4 text-right">
            <div class="text-caption text-grey">
              Mostrando {{ stats.inStock }} con stock / {{ stats.totalItems }} en catálogo
            </div>
          </div>
        </q-card-section>
      </q-card>

      <!-- Tabla de Datos -->
      <q-card flat bordered>
        <q-table :grid="$q.screen.lt.md"
          :rows="inventoryList"
          :columns="columns"
          row-key="id"
          :loading="loading"
          flat
          :pagination="{ rowsPerPage: 15 }"
        >
          <!-- Custom render para la columna de stock -->
          <template v-slot:body-cell-stock="props">
            <q-td :props="props">
              <q-badge 
                :color="props.row.localStock > 0 ? 'positive' : 'negative'"
                class="text-weight-bold"
                style="font-size: 14px; padding: 4px 8px;"
              >
                {{ props.row.localStock > 0 ? props.row.localStock : 'AGOTADO' }}
              </q-badge>
            </q-td>
          </template>
          
          <!-- Custom render para la unidad (alineación visual) -->
          <template v-slot:body-cell-unit="props">
            <q-td :props="props" class="text-grey-8">
              {{ props.row.unit?.abbreviation || 'UN' }}
            </q-td>
          </template>

          <template v-slot:no-data>
            <div class="full-width row flex-center text-accent q-gutter-sm q-pa-xl text-h6">
              <q-icon size="2em" name="sentiment_dissatisfied" />
              <span>No se encontraron productos en tu inventario local.</span>
            </div>
          </template>
        </q-table>
      </q-card>
      
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useKitchenInventory } from '~/composables/features/useKitchenInventory'

const {
  loading, hasAssignedWarehouse, searchQuery, hideOutOfStock, inventoryList, stats,
  isGlobalUser, activeWarehouseId, warehouses
} = useKitchenInventory()

const columns = [
  { name: 'code', label: 'Código', field: 'code', align: 'left', sortable: true },
  { name: 'name', label: 'Producto', field: 'name', align: 'left', sortable: true },
  { name: 'category', label: 'Categoría', field: row => row.category?.name || 'Sin Categoría', align: 'left', sortable: true },
  { name: 'stock', label: 'Stock Disponible', field: 'localStock', align: 'center', sortable: true },
  { name: 'unit', label: 'Unidad', field: row => row.unit?.abbreviation, align: 'center', sortable: true },
]
</script>

