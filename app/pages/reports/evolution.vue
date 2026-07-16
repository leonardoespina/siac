<template>
  <q-page padding>
    <div class="row items-center q-mb-md">
      <q-btn flat round icon="arrow_back" color="primary" to="/reports" class="q-mr-sm" />
      <div class="text-h5 text-weight-bold text-primary">Reporte de Evolución de Gasto</div>
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

    <div v-if="loading" class="flex flex-center q-pa-xl">
      <q-spinner-dots color="primary" size="40px" />
    </div>

    <div v-else>
      <q-card bordered flat class="q-mb-lg bg-white">
        <q-card-section>
          <div class="text-subtitle1 text-weight-bold text-grey-8 q-mb-sm">
            <q-icon name="calendar_month" color="blue-8" size="sm" class="q-mr-sm" />
            Consumo Histórico Mensual
          </div>
          
          <div class="row q-px-sm q-mb-sm text-caption text-weight-bold text-grey-6 text-uppercase">
            <div class="col-3">Mes</div>
            <div class="col-6">Proporción de Gasto</div>
            <div class="col-3 text-right">Gasto Total ($)</div>
          </div>

          <div v-if="consumptionSummaryByMonth.length === 0" class="text-center text-grey q-pa-lg">
            No hay consumos registrados en este rango de fechas.
          </div>

          <div 
            v-for="mes in consumptionSummaryByMonth" 
            :key="mes.id" 
            class="row items-center q-py-xs q-px-sm"
          >
            <div class="col-3 text-subtitle2 text-grey-9 text-capitalize ellipsis">
              {{ mes.monthString }}
            </div>
            
            <div class="col-6 q-px-md">
              <q-linear-progress 
                :value="maxMonthValue > 0 ? mes.value / maxMonthValue : 0" 
                color="blue-6" 
                size="20px" 
                rounded 
                class="bg-grey-3" 
              />
            </div>
            
            <div class="col-3 text-right text-subtitle2 text-weight-bold text-blue-9">
              ${{ Number(mes.value).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) }}
            </div>
          </div>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useWarehousesStore } from '~/stores/warehouses'
import { useReports } from '~/composables/features/useReports'
import { useAuthStore } from '~/stores/auth'
import { date } from 'quasar'

const auth = useAuthStore()
const warehousesStore = useWarehousesStore()
const { loading, consumptionSummaryByMonth, fetchConsumptionsReport } = useReports()

const maxMonthValue = computed(() => {
  if (!consumptionSummaryByMonth.value || consumptionSummaryByMonth.value.length === 0) return 0
  return Math.max(...consumptionSummaryByMonth.value.map(m => m.value))
})

const today = new Date()
// Por defecto mostrar el año actual o últimos 6 meses
const lastYear = new Date()
lastYear.setMonth(lastYear.getMonth() - 6)

const startDate = ref(date.formatDate(lastYear, 'YYYY-MM-DD'))
const endDate = ref(date.formatDate(today, 'YYYY-MM-DD'))
const filterWarehouse = ref<number | null>(null)

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
