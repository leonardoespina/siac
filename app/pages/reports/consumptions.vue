<template>
  <q-page padding>
    <div class="row items-center q-mb-md">
      <q-btn flat round icon="arrow_back" color="primary" @click="$router.push('/reports')" class="q-mr-sm" />
      <div class="text-h4 text-weight-bold text-primary">Reporte de Consumos y Mermas</div>
    </div>

    <!-- Filtros -->
    <q-card bordered flat class="q-mb-md bg-grey-1">
      <q-card-section class="row q-col-gutter-md items-center">
        <div class="col-12 col-md-3">
          <q-input v-model="startDate" type="date" label="Desde" outlined dense />
        </div>
        <div class="col-12 col-md-3">
          <q-input v-model="endDate" type="date" label="Hasta" outlined dense />
        </div>
        <div v-if="!auth.user?.warehouseId" class="col-12 col-md-3">
          <q-select
            v-model="filterWarehouse"
            :options="warehousesStore.warehouses.filter(w => w.type === 'LOCAL')"
            option-value="id"
            option-label="name"
            label="Comedor (Opcional)"
            outlined dense clearable emit-value map-options
          />
        </div>
        <div class="col-12 col-md-3 text-right">
          <q-btn color="primary" icon="search" label="Filtrar" @click="handleFilter" :loading="loading" class="full-width" />
        </div>
      </q-card-section>
    </q-card>

    <div v-if="loading" class="row justify-center q-pa-xl">
      <q-spinner color="primary" size="3em" />
    </div>

    <div v-else>
      <div class="row q-col-gutter-md q-mb-md">
        <div class="col-12 col-md-6">
          <q-card bordered flat class="bg-blue-8 text-white text-center q-pa-sm">
            <div class="text-subtitle2 text-uppercase">Total Consumido (Cocina)</div>
            <div class="text-h4 text-weight-bold">{{ totalConsumptionItems.toLocaleString() }} unds</div>
            <div class="text-subtitle1 text-weight-bold q-mt-xs text-blue-2">${{ Number(totalConsumptionValue || 0).toFixed(2) }}</div>
          </q-card>
        </div>
        <div class="col-12 col-md-6">
          <q-card bordered flat class="bg-red-8 text-white text-center q-pa-sm">
            <div class="text-subtitle2 text-uppercase">Total Mermado (Pérdidas)</div>
            <div class="text-h4 text-weight-bold">{{ totalLossItems.toLocaleString() }} unds</div>
            <div class="text-subtitle1 text-weight-bold q-mt-xs text-red-2">${{ Number(totalLossValue || 0).toFixed(2) }}</div>
          </q-card>
        </div>
      </div>

      <q-card bordered flat>
        <q-table :grid="$q.screen.lt.md"
          :rows="consumptionDetails"
          :columns="columns"
          row-key="id"
          flat bordered
          :pagination="{ rowsPerPage: 15, sortBy: 'date', descending: true }"
        >
          <template v-slot:body-cell-type="props">
            <q-td :props="props">
              <q-chip :color="props.row.type === 'CONSUMPTION' ? 'blue-1' : 'red-1'" :text-color="props.row.type === 'CONSUMPTION' ? 'blue-8' : 'red-8'" size="sm">
                {{ props.row.type === 'CONSUMPTION' ? 'Consumo' : 'Merma' }}
              </q-chip>
            </q-td>
          </template>
          
          <template v-slot:body-cell-quantity="props">
            <q-td :props="props" class="text-right text-weight-bold">
              {{ props.row.quantity }}
            </q-td>
          </template>
          
          <!-- MODO MÓVIL (GRID): Tarjeta Reporte Consumo -->
          <template v-slot:item="props">
            <div class="q-pa-xs col-12 col-sm-6">
              <q-card bordered flat class="bg-white">
                <q-card-section class="q-pb-none row justify-between items-start">
                  <div class="text-weight-bold" style="max-width: 70%; line-height: 1.1;">
                    {{ props.row.productName }}
                  </div>
                  <q-chip :color="props.row.type === 'CONSUMPTION' ? 'blue-1' : 'red-1'" :text-color="props.row.type === 'CONSUMPTION' ? 'blue-8' : 'red-8'" size="sm" class="q-ma-none">
                    {{ props.row.type === 'CONSUMPTION' ? 'Consumo' : 'Merma' }}
                  </q-chip>
                </q-card-section>
                
                <q-card-section class="q-pt-sm q-pb-xs">
                  <div class="text-caption text-grey-8">{{ props.row.category }}</div>
                  <div class="text-caption text-grey-6">{{ new Date(props.row.date).toLocaleString() }} - {{ props.row.warehouse }}</div>
                </q-card-section>
                
                <q-separator />
                
                <q-card-section class="bg-grey-1 row justify-between items-center q-py-sm">
                  <div>
                    <div class="text-caption text-grey-8">Costo: <span class="text-weight-bold">${{ Number(props.row.value || 0).toFixed(2) }}</span></div>
                    <div class="text-caption text-grey-6" style="font-size: 10px;">Op: {{ props.row.operator }}</div>
                  </div>
                  <div class="text-right">
                    <span class="text-weight-bold text-h6">{{ props.row.quantity }}</span>
                    <span class="text-caption text-grey-8 q-ml-xs">{{ props.row.unit }}</span>
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </template>
        </q-table>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useWarehousesStore } from '~/stores/warehouses'
import { useReports } from '~/composables/features/useReports'
import { useAuthStore } from '~/stores/auth'
import { date } from 'quasar'

const auth = useAuthStore()
const warehousesStore = useWarehousesStore()
const { loading, totalConsumptionItems, totalLossItems, totalConsumptionValue, totalLossValue, consumptionDetails, fetchConsumptionsReport } = useReports()

const today = new Date()
const startDate = ref(date.formatDate(today, 'YYYY-MM-DD'))
const endDate = ref(date.formatDate(today, 'YYYY-MM-DD'))
const filterWarehouse = ref<number | null>(null)

const columns = [
  { name: 'date', label: 'Fecha / Hora', field: 'date', align: 'left' as const, format: (val: string) => new Date(val).toLocaleString(), sortable: true },
  { name: 'warehouse', label: 'Comedor', field: 'warehouse', align: 'left' as const, sortable: true },
  { name: 'type', label: 'Tipo', field: 'type', align: 'center' as const, sortable: true },
  { name: 'productName', label: 'Producto', field: 'productName', align: 'left' as const, sortable: true },
  { name: 'category', label: 'Rubro', field: 'category', align: 'left' as const, sortable: true },
  { name: 'quantity', label: 'Cant', field: 'quantity', align: 'right' as const, sortable: true },
  { name: 'unit', label: 'Und', field: 'unit', align: 'left' as const },
  { name: 'value', label: 'Costo ($)', field: 'value', align: 'right' as const, format: (val: number) => `$${Number(val || 0).toFixed(2)}`, sortable: true },
  { name: 'operator', label: 'Registrado Por', field: 'operator', align: 'left' as const }
]

const handleFilter = () => {
  const startISO = startDate.value ? new Date(startDate.value + 'T00:00:00').toISOString() : ''
  const endISO = endDate.value ? new Date(endDate.value + 'T23:59:59').toISOString() : ''
  fetchConsumptionsReport(startISO, endISO, filterWarehouse.value)
}

onMounted(async () => {
  if (warehousesStore.warehouses.length === 0) await warehousesStore.fetchAll()
  handleFilter()
})
</script>

