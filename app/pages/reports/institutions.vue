<template>
  <q-page padding>
    <div class="row items-center q-mb-md">
      <q-btn flat round icon="arrow_back" color="primary" @click="$router.push('/reports')" class="q-mr-sm" />
      <div class="text-h4 text-weight-bold text-primary">Reporte de Apoyos Institucionales</div>
    </div>

    <!-- Filtros -->
    <q-card bordered flat class="q-mb-md bg-grey-1">
      <q-card-section class="row q-col-gutter-md items-center">
        <div class="col-12 col-md-4">
          <q-input v-model="startDate" type="date" label="Desde" outlined dense />
        </div>
        <div class="col-12 col-md-4">
          <q-input v-model="endDate" type="date" label="Hasta" outlined dense />
        </div>
        <div class="col-12 col-md-4 text-right">
          <q-btn color="primary" icon="search" label="Filtrar" @click="handleFilter" :loading="loading" class="full-width" />
        </div>
      </q-card-section>
    </q-card>

    <div v-if="loading" class="row justify-center q-pa-xl">
      <q-spinner color="primary" size="3em" />
    </div>

    <div v-else>
      <div class="text-h6 q-mb-md text-grey-8">Resumen por Tipo de Institución</div>
      <div class="row q-col-gutter-md q-mb-lg">
        <div class="col-12 col-md-3" v-for="sum in institutionsSummary" :key="sum.type">
          <q-card bordered flat class="text-center q-pa-md">
            <q-icon :name="getIconForType(sum.type)" :color="getColorForType(sum.type)" size="48px" class="q-mb-sm" />
            <div class="text-subtitle1 text-weight-bold" :class="`text-${getColorForType(sum.type)}`">{{ sum.type }}</div>
            <div class="text-body2 text-grey-7">{{ sum.count }} donaciones realizadas</div>
            <div class="text-h6 q-mt-sm">{{ sum.totalItems.toLocaleString() }} productos</div>
          </q-card>
        </div>
        
        <div v-if="institutionsSummary.length === 0" class="col-12 text-center text-grey q-pa-lg">
          No hay apoyos registrados en este rango de fechas.
        </div>
      </div>

      <div class="text-h6 q-mb-md text-grey-8" v-if="institutionsDetails.length > 0">Detalle de Donaciones</div>
      <q-card bordered flat v-if="institutionsDetails.length > 0">
        <q-table :grid="$q.screen.lt.md"
          :rows="institutionsDetails"
          :columns="columns"
          row-key="id"
          flat bordered
          :pagination="{ rowsPerPage: 10, sortBy: 'date', descending: true }"
        >
          <template v-slot:body="props">
            <q-tr :props="props">
              <q-td key="date" :props="props">
                {{ new Date(props.row.date).toLocaleDateString() }}
              </q-td>
              <q-td key="warehouse" :props="props">
                {{ props.row.warehouse }}
              </q-td>
              <q-td key="institutionName" :props="props">
                {{ props.row.institutionName }}
              </q-td>
              <q-td key="institutionType" :props="props">
                <q-chip :color="`bg-${getColorForType(props.row.institutionType)}-1`" :text-color="getColorForType(props.row.institutionType)" size="sm" :icon="getIconForType(props.row.institutionType)">
                  {{ props.row.institutionType }}
                </q-chip>
              </q-td>
              <q-td key="itemsCount" :props="props">
                {{ props.row.itemsCount }}
              </q-td>
              <q-td key="details" :props="props">
                <q-btn flat round color="primary" :icon="props.expand ? 'visibility_off' : 'visibility'" @click="props.expand = !props.expand">
                  <q-tooltip>Ver Productos</q-tooltip>
                </q-btn>
              </q-td>
            </q-tr>
            
            <q-tr :props="props" v-show="props.expand">
              <q-td colspan="100%" class="bg-grey-1 q-pa-md">
                <div class="text-weight-bold q-mb-sm">Productos Entregados:</div>
                <div class="row q-gutter-sm">
                  <q-chip v-for="(item, idx) in props.row.details" :key="idx" color="white" text-color="black">
                    {{ item.quantity }} {{ item.unit }} - {{ item.productName }}
                  </q-chip>
                </div>
              </q-td>
            </q-tr>
          </template>

          <!-- MODO GRID MÓVIL -->
          <template v-slot:item="props">
            <div class="q-pa-xs col-12 col-sm-6 col-md-4">
              <q-card bordered flat>
                <q-card-section class="q-pb-none">
                  <div class="row justify-between q-mb-sm">
                    <div class="text-caption text-grey-7">Fecha</div>
                    <div class="text-weight-bold">{{ new Date(props.row.date).toLocaleDateString() }}</div>
                  </div>
                  <div class="row justify-between q-mb-sm">
                    <div class="text-caption text-grey-7">Despachado Desde</div>
                    <div class="text-weight-bold text-right">{{ props.row.warehouse }}</div>
                  </div>
                  <div class="row justify-between q-mb-sm">
                    <div class="text-caption text-grey-7">Institución</div>
                    <div class="text-weight-bold text-right">{{ props.row.institutionName }}</div>
                  </div>
                  <div class="row justify-between q-mb-sm">
                    <div class="text-caption text-grey-7">Tipo</div>
                    <div class="text-right">
                      <q-chip :color="`bg-${getColorForType(props.row.institutionType)}-1`" :text-color="getColorForType(props.row.institutionType)" size="sm" :icon="getIconForType(props.row.institutionType)">
                        {{ props.row.institutionType }}
                      </q-chip>
                    </div>
                  </div>
                  <div class="row justify-between q-mb-sm">
                    <div class="text-caption text-grey-7">Cant. Productos</div>
                    <div class="text-weight-bold">{{ props.row.itemsCount }}</div>
                  </div>
                </q-card-section>
                <q-separator />
                <q-card-actions align="between">
                  <span class="text-grey-7 text-caption q-ml-sm">Ver Productos</span>
                  <q-btn flat round color="primary" :icon="props.expand ? 'visibility_off' : 'visibility'" @click="props.expand = !props.expand" />
                </q-card-actions>
                
                <q-slide-transition>
                  <div v-show="props.expand">
                    <q-separator />
                    <q-card-section class="bg-grey-1">
                      <div class="text-caption text-weight-bold q-mb-xs">Productos Entregados:</div>
                      <div class="row q-gutter-sm">
                        <q-chip v-for="(item, idx) in props.row.details" :key="idx" color="white" text-color="black" size="sm">
                          {{ item.quantity }} {{ item.unit }} - {{ item.productName }}
                        </q-chip>
                      </div>
                    </q-card-section>
                  </div>
                </q-slide-transition>
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
import { useReports } from '~/composables/features/useReports'
import { date } from 'quasar'

const { loading, institutionsSummary, institutionsDetails, fetchInstitutionsReport } = useReports()

const today = new Date()
// Por defecto mostrar el último mes
const lastMonth = new Date()
lastMonth.setMonth(lastMonth.getMonth() - 1)

const startDate = ref(date.formatDate(lastMonth, 'YYYY-MM-DD'))
const endDate = ref(date.formatDate(today, 'YYYY-MM-DD'))

const columns = [
  { name: 'date', label: 'Fecha', field: 'date', align: 'left' as const, format: (val: string) => new Date(val).toLocaleDateString(), sortable: true },
  { name: 'warehouse', label: 'Despachado Desde', field: 'warehouse', align: 'left' as const, sortable: true },
  { name: 'institutionName', label: 'Institución', field: 'institutionName', align: 'left' as const, sortable: true },
  { name: 'institutionType', label: 'Tipo', field: 'institutionType', align: 'center' as const, sortable: true },
  { name: 'itemsCount', label: 'Cant. Productos', field: 'itemsCount', align: 'center' as const, sortable: true },
  { name: 'details', label: 'Ver Detalle', field: 'id', align: 'center' as const }
]

const getIconForType = (type: string) => {
  switch(type) {
    case 'Educativa': return 'school'
    case 'Salud': return 'local_hospital'
    case 'Comunitaria': return 'groups'
    case 'Gubernamental': return 'account_balance'
    default: return 'volunteer_activism'
  }
}

const getColorForType = (type: string) => {
  switch(type) {
    case 'Educativa': return 'blue-8'
    case 'Salud': return 'red-8'
    case 'Comunitaria': return 'orange-8'
    case 'Gubernamental': return 'grey-8'
    default: return 'primary'
  }
}

const handleFilter = () => {
  const startISO = startDate.value ? new Date(startDate.value + 'T00:00:00').toISOString() : ''
  const endISO = endDate.value ? new Date(endDate.value + 'T23:59:59').toISOString() : ''
  fetchInstitutionsReport(startISO, endISO)
}

onMounted(() => {
  handleFilter()
})
</script>

