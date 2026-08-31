<template>
  <q-page padding>
    <!-- Cabecera de Página -->
    <div class="row items-center justify-between q-mb-md">
      <div class="row items-center">
        <q-btn flat round icon="arrow_back" color="primary" to="/reports" class="q-mr-sm" />
        <div>
          <div class="text-h4 text-weight-bold text-primary">Reporte de Consumos por Servicios</div>
          <div class="text-subtitle1 text-grey-7">Valorización económica y volumen de despachos por turno y comedor</div>
        </div>
      </div>
      <div class="row q-gutter-sm">
        <q-btn
          color="green-8"
          icon="download"
          label="Exportar Excel"
          @click="handleExport"
          :loading="loading"
          :disable="details.length === 0"
        />
        <q-btn
          flat
          round
          color="primary"
          icon="refresh"
          @click="fetchReport"
          :loading="loading"
        >
          <q-tooltip>Actualizar Datos</q-tooltip>
        </q-btn>
      </div>
    </div>

    <!-- Barra de Filtros -->
    <q-card bordered flat class="q-mb-md bg-grey-1">
      <q-card-section class="row q-col-gutter-md items-center">
        <div class="col-12 col-sm-6 col-md-3">
          <SharedDateInput v-model="startDate" label="Desde" />
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <SharedDateInput v-model="endDate" label="Hasta" />
        </div>
        <div v-if="!auth.user?.warehouseId" class="col-12 col-sm-6 col-md-3">
          <q-select
            v-model="selectedWarehouse"
            :options="[{ id: null, name: 'Todas las Cocinas (General)' }, ...localWarehouses]"
            option-value="id"
            option-label="name"
            label="Cocina / Comedor"
            outlined dense emit-value map-options bg-color="white"
          />
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <q-select
            v-model="selectedService"
            :options="serviceFilterOptions"
            option-value="value"
            option-label="label"
            label="Tipo de Servicio"
            outlined dense clearable emit-value map-options bg-color="white"
          />
        </div>
      </q-card-section>

      <!-- Accesos Rápidos de Fecha -->
      <q-separator />
      <q-card-actions class="q-px-md q-py-sm row justify-between items-center">
        <div class="row q-gutter-xs">
          <q-btn size="sm" flat color="primary" label="Hoy" @click="setToday" />
          <q-btn size="sm" flat color="primary" label="Esta Semana" @click="setThisWeek" />
          <q-btn size="sm" flat color="primary" label="Este Mes" @click="setThisMonth" />
        </div>
        <q-btn color="primary" icon="search" label="Aplicar Filtros" @click="fetchReport" :loading="loading" />
      </q-card-actions>
    </q-card>

    <!-- Indicador de Carga -->
    <div v-if="loading" class="row justify-center q-pa-xl">
      <q-spinner-dots color="primary" size="4em" />
    </div>

    <div v-else>
      <!-- TARJETAS PRINCIPALES DE SERVICIOS (MODELO EXACTO DE REFERENCIA) -->
      <div class="row q-col-gutter-lg q-mb-md">
        <!-- 1. Desayuno -->
        <div class="col-12 col-sm-6 col-md-3">
          <q-card bordered class="bg-white q-pa-md text-center shadow-1 rounded-borders">
            <div class="text-h6 text-weight-bold text-grey-8 q-mb-xs">Desayuno</div>
            <div class="text-h4 text-weight-bold text-primary q-my-sm">
              {{ formatCurrency(summary.DESAYUNO.totalValue) }}
            </div>
            <div class="text-caption text-grey-6">
              {{ formatQuantity(summary.DESAYUNO.totalItems) }} unds/kg &bull; {{ summary.DESAYUNO.transactionCount }} despachos
            </div>
          </q-card>
        </div>

        <!-- 2. Almuerzo -->
        <div class="col-12 col-sm-6 col-md-3">
          <q-card bordered class="bg-white q-pa-md text-center shadow-1 rounded-borders">
            <div class="text-h6 text-weight-bold text-grey-8 q-mb-xs">Almuerzo</div>
            <div class="text-h4 text-weight-bold text-primary q-my-sm">
              {{ formatCurrency(summary.ALMUERZO.totalValue) }}
            </div>
            <div class="text-caption text-grey-6">
              {{ formatQuantity(summary.ALMUERZO.totalItems) }} unds/kg &bull; {{ summary.ALMUERZO.transactionCount }} despachos
            </div>
          </q-card>
        </div>

        <!-- 3. Cena -->
        <div class="col-12 col-sm-6 col-md-3">
          <q-card bordered class="bg-white q-pa-md text-center shadow-1 rounded-borders">
            <div class="text-h6 text-weight-bold text-grey-8 q-mb-xs">Cena</div>
            <div class="text-h4 text-weight-bold text-primary q-my-sm">
              {{ formatCurrency(summary.CENA.totalValue) }}
            </div>
            <div class="text-caption text-grey-6">
              {{ formatQuantity(summary.CENA.totalItems) }} unds/kg &bull; {{ summary.CENA.transactionCount }} despachos
            </div>
          </q-card>
        </div>

        <!-- 4. Sobrecena -->
        <div class="col-12 col-sm-6 col-md-3">
          <q-card bordered class="bg-white q-pa-md text-center shadow-1 rounded-borders">
            <div class="text-h6 text-weight-bold text-grey-8 q-mb-xs">Sobrecena</div>
            <div class="text-h4 text-weight-bold text-primary q-my-sm">
              {{ formatCurrency(summary.SOBRECENA.totalValue) }}
            </div>
            <div class="text-caption text-grey-6">
              {{ formatQuantity(summary.SOBRECENA.totalItems) }} unds/kg &bull; {{ summary.SOBRECENA.transactionCount }} despachos
            </div>
          </q-card>
        </div>
      </div>

      <!-- BANNER DE TOTAL GENERAL DESTACADO -->
      <div class="row justify-center q-my-lg">
        <q-card bordered flat class="bg-blue-1 text-primary q-px-xl q-py-md text-center rounded-borders">
          <div class="text-h4 text-weight-bold">
            Total Período = {{ formatCurrency(summary.grandTotalValue) }}
          </div>
          <div class="text-subtitle2 text-grey-8 q-mt-xs">
            Consumo total: {{ formatQuantity(summary.grandTotalItems) }} unidades/kg en {{ summary.totalTransactions }} despachos
          </div>
        </q-card>
      </div>

      <!-- SECCIÓN: DESGLOSE FINANCIERO POR COMEDOR / COCINA -->
      <div class="q-mb-lg" v-if="byWarehouse.length > 0">
        <div class="text-h6 text-weight-bold text-grey-9 q-mb-md row items-center">
          <q-icon name="apartment" color="primary" class="q-mr-sm" />
          Desglose Financiero por Cocina / Comedor
        </div>
        <div class="row q-col-gutter-md">
          <div v-for="wh in byWarehouse" :key="wh.warehouseId" class="col-12 col-sm-6 col-md-4">
            <q-card bordered flat class="bg-white q-pa-md">
              <div class="row justify-between items-center q-mb-xs">
                <div class="text-subtitle1 text-weight-bold text-grey-9 ellipsis">{{ wh.warehouseName }}</div>
                <q-badge color="primary" class="text-weight-bold">{{ formatCurrency(wh.totalValue) }}</q-badge>
              </div>
              <q-separator class="q-my-sm" />
              <div class="row q-col-gutter-xs text-caption text-grey-8">
                <div class="col-6">☕ Desayuno: <span class="text-weight-bold">{{ formatCurrency(wh.services.DESAYUNO.value) }}</span></div>
                <div class="col-6">🍲 Almuerzo: <span class="text-weight-bold">{{ formatCurrency(wh.services.ALMUERZO.value) }}</span></div>
                <div class="col-6">🍽️ Cena: <span class="text-weight-bold">{{ formatCurrency(wh.services.CENA.value) }}</span></div>
                <div class="col-6">🌙 Sobrecena: <span class="text-weight-bold">{{ formatCurrency(wh.services.SOBRECENA.value) }}</span></div>
              </div>
            </q-card>
          </div>
        </div>
      </div>

      <!-- SECCIÓN: TABLA DETALLADA DE DESPACHOS -->
      <q-card bordered flat class="bg-white">
        <q-card-section class="row justify-between items-center">
          <div class="text-h6 text-weight-bold text-grey-9 row items-center">
            <q-icon name="list_alt" color="primary" class="q-mr-sm" />
            Detalle de Despachos Registrados
          </div>
          <q-chip color="blue-1" text-color="primary" class="text-weight-bold">
            {{ details.length }} Registros
          </q-chip>
        </q-card-section>

        <q-table
          :grid="$q.screen.lt.md"
          :rows="details"
          :columns="columns"
          row-key="id"
          flat
          bordered
          :pagination="{ rowsPerPage: 15, sortBy: 'createdAt', descending: true }"
          no-data-label="No hay consumos registrados para los filtros seleccionados"
        >
          <!-- Formato de Servicio con Chip -->
          <template v-slot:body-cell-serviceType="props">
            <q-td :props="props">
              <q-chip
                :color="getServiceChipColor(props.row.serviceType)"
                :text-color="getServiceChipTextColor(props.row.serviceType)"
                size="sm"
                class="text-weight-bold"
              >
                {{ props.row.serviceType }}
              </q-chip>
            </q-td>
          </template>

          <!-- Formato de Cantidad -->
          <template v-slot:body-cell-quantity="props">
            <q-td :props="props" class="text-right text-weight-bold">
              {{ formatQuantity(props.row.quantity) }} {{ props.row.unitAbbr }}
            </q-td>
          </template>

          <!-- Formato de Precio Unitario -->
          <template v-slot:body-cell-unitPrice="props">
            <q-td :props="props" class="text-right">
              {{ formatCurrency(props.row.unitPrice) }}
            </q-td>
          </template>

          <!-- Formato de Total $ -->
          <template v-slot:body-cell-totalValue="props">
            <q-td :props="props" class="text-right text-weight-bold text-primary">
              {{ formatCurrency(props.row.totalValue) }}
            </q-td>
          </template>

          <!-- VISTA RESPONSIVA MÓVIL (GRID CARDS) -->
          <template v-slot:item="props">
            <div class="q-pa-xs col-12 col-sm-6">
              <q-card bordered flat class="bg-white">
                <q-card-section class="row justify-between items-start q-pb-xs">
                  <div>
                    <div class="text-weight-bold text-subtitle1">{{ props.row.productName }}</div>
                    <div class="text-caption text-grey-6">{{ props.row.productCode }} &bull; {{ props.row.categoryName }}</div>
                  </div>
                  <q-chip
                    :color="getServiceChipColor(props.row.serviceType)"
                    :text-color="getServiceChipTextColor(props.row.serviceType)"
                    size="sm"
                    class="text-weight-bold"
                  >
                    {{ props.row.serviceType }}
                  </q-chip>
                </q-card-section>

                <q-card-section class="q-py-xs">
                  <div class="text-caption text-grey-8">
                    <q-icon name="restaurant" size="xs" /> {{ props.row.warehouseName }}
                  </div>
                  <div class="text-caption text-grey-6">
                    <q-icon name="schedule" size="xs" /> {{ new Date(props.row.createdAt).toLocaleString() }}
                  </div>
                </q-card-section>

                <q-separator />

                <q-card-section class="bg-grey-1 row justify-between items-center q-py-sm">
                  <div>
                    <div class="text-caption text-grey-8">Total: <span class="text-weight-bold text-primary">{{ formatCurrency(props.row.totalValue) }}</span></div>
                    <div class="text-caption text-grey-6">Op: {{ props.row.operatorName }}</div>
                  </div>
                  <div class="text-right">
                    <span class="text-weight-bold text-h6">{{ formatQuantity(props.row.quantity) }}</span>
                    <span class="text-caption text-grey-8 q-ml-xs">{{ props.row.unitAbbr }}</span>
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
import { computed, onMounted } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useWarehousesStore } from '~/stores/warehouses'
import { useKitchenServicesReport } from '~/composables/features/useKitchenServicesReport'
import { formatCurrency, formatQuantity } from '~/composables/shared/useNumberFormatter'

const auth = useAuthStore()
const warehousesStore = useWarehousesStore()

const {
  loading,
  startDate,
  endDate,
  selectedWarehouse,
  selectedService,
  summary,
  byWarehouse,
  details,
  fetchReport,
  setToday,
  setThisWeek,
  setThisMonth,
  exportToExcel
} = useKitchenServicesReport()

const localWarehouses = computed(() => {
  return warehousesStore.warehouses.filter(w => w.type === 'LOCAL')
})

const serviceFilterOptions = [
  { label: 'Todos los Servicios', value: null },
  { label: 'Desayuno', value: 'DESAYUNO' },
  { label: 'Almuerzo', value: 'ALMUERZO' },
  { label: 'Cena', value: 'CENA' },
  { label: 'Sobrecena', value: 'SOBRECENA' },
  { label: 'Otros Servicios', value: 'OTROS' }
]

const columns = [
  { name: 'createdAt', label: 'Fecha / Hora', field: 'createdAt', align: 'left' as const, format: (val: string) => new Date(val).toLocaleString(), sortable: true },
  { name: 'warehouseName', label: 'Comedor / Cocina', field: 'warehouseName', align: 'left' as const, sortable: true },
  { name: 'serviceType', label: 'Servicio', field: 'serviceType', align: 'center' as const, sortable: true },
  { name: 'productName', label: 'Producto', field: 'productName', align: 'left' as const, sortable: true },
  { name: 'categoryName', label: 'Rubro', field: 'categoryName', align: 'left' as const, sortable: true },
  { name: 'quantity', label: 'Cantidad', field: 'quantity', align: 'right' as const, sortable: true },
  { name: 'unitPrice', label: 'Costo Unit.', field: 'unitPrice', align: 'right' as const, sortable: true },
  { name: 'totalValue', label: 'Total ($)', field: 'totalValue', align: 'right' as const, sortable: true },
  { name: 'operatorName', label: 'Operador', field: 'operatorName', align: 'left' as const, sortable: true }
]

const getServiceChipColor = (type: string) => {
  switch (type) {
    case 'DESAYUNO': return 'amber-2'
    case 'ALMUERZO': return 'blue-2'
    case 'CENA': return 'purple-2'
    case 'SOBRECENA': return 'indigo-2'
    default: return 'grey-3'
  }
}

const getServiceChipTextColor = (type: string) => {
  switch (type) {
    case 'DESAYUNO': return 'amber-10'
    case 'ALMUERZO': return 'blue-10'
    case 'CENA': return 'purple-10'
    case 'SOBRECENA': return 'indigo-10'
    default: return 'grey-9'
  }
}

const handleExport = () => {
  const currentWarehouse = localWarehouses.value.find(w => w.id === selectedWarehouse.value)
  exportToExcel(currentWarehouse?.name || 'Todas las Cocinas')
}

onMounted(async () => {
  if (warehousesStore.warehouses.length === 0) {
    await warehousesStore.fetchAll()
  }
  await fetchReport()
})
</script>
