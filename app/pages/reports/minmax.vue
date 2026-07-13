<template>
  <q-page padding>
    <div class="row items-center q-mb-md">
      <q-btn flat round icon="arrow_back" color="primary" @click="$router.push('/reports')" class="q-mr-sm" />
      <div class="text-h4 text-weight-bold text-primary">Mínimos y Máximos por Rubro</div>
    </div>

    <div v-if="loading" class="row justify-center q-pa-xl">
      <q-spinner color="primary" size="3em" />
    </div>

    <div v-else>
      <q-card bordered flat>
        <q-table :grid="$q.screen.lt.md"
          :rows="minMaxStats"
          :columns="columns"
          row-key="id"
          flat bordered
          :pagination="{ rowsPerPage: 15 }"
        >
          <template v-slot:body-cell-belowMin="props">
            <q-td :props="props" class="text-center">
              <q-badge :color="props.row.belowMin > 0 ? 'negative' : 'grey-4'" :text-color="props.row.belowMin > 0 ? 'white' : 'grey-8'" class="text-weight-bold">
                {{ props.row.belowMin }} prods
              </q-badge>
            </q-td>
          </template>

          <template v-slot:body-cell-inRange="props">
            <q-td :props="props" class="text-center">
              <q-badge :color="props.row.inRange > 0 ? 'positive' : 'grey-4'" :text-color="props.row.inRange > 0 ? 'white' : 'grey-8'" class="text-weight-bold">
                {{ props.row.inRange }} prods
              </q-badge>
            </q-td>
          </template>

          <template v-slot:body-cell-aboveMax="props">
            <q-td :props="props" class="text-center">
              <q-badge :color="props.row.aboveMax > 0 ? 'blue-8' : 'grey-4'" :text-color="props.row.aboveMax > 0 ? 'white' : 'grey-8'" class="text-weight-bold">
                {{ props.row.aboveMax }} prods
              </q-badge>
            </q-td>
          </template>
          
          <template v-slot:body-cell-totalItems="props">
            <q-td :props="props" class="text-center text-weight-bold text-grey-8">
              {{ props.row.totalItems }}
            </q-td>
          </template>

          <!-- MODO MÓVIL (GRID): Tarjeta Mín/Máx -->
          <template v-slot:item="props">
            <div class="q-pa-xs col-12 col-sm-6">
              <q-card bordered flat class="bg-white">
                <q-card-section class="q-pb-sm bg-grey-1 row justify-between items-center">
                  <div class="text-weight-bold text-subtitle1">{{ props.row.name }}</div>
                  <div class="text-caption text-grey-8">Total: {{ props.row.totalItems }} prods</div>
                </q-card-section>
                
                <q-card-section class="q-pt-sm row justify-around text-center">
                  <div>
                    <div class="text-caption text-grey-6 q-mb-xs">Alerta (Mín)</div>
                    <q-badge :color="props.row.belowMin > 0 ? 'negative' : 'grey-4'" :text-color="props.row.belowMin > 0 ? 'white' : 'grey-8'" class="text-weight-bold">
                      {{ props.row.belowMin }}
                    </q-badge>
                  </div>
                  <div>
                    <div class="text-caption text-grey-6 q-mb-xs">Sano (Rango)</div>
                    <q-badge :color="props.row.inRange > 0 ? 'positive' : 'grey-4'" :text-color="props.row.inRange > 0 ? 'white' : 'grey-8'" class="text-weight-bold">
                      {{ props.row.inRange }}
                    </q-badge>
                  </div>
                  <div>
                    <div class="text-caption text-grey-6 q-mb-xs">Exceso (Máx)</div>
                    <q-badge :color="props.row.aboveMax > 0 ? 'blue-8' : 'grey-4'" :text-color="props.row.aboveMax > 0 ? 'white' : 'grey-8'" class="text-weight-bold">
                      {{ props.row.aboveMax }}
                    </q-badge>
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
import { onMounted } from 'vue'
import { useReports } from '~/composables/features/useReports'

const { loading, minMaxStats, fetchMinMaxReport } = useReports()

const columns = [
  { name: 'name', label: 'Rubro / Categoría', field: 'name', align: 'left' as const, sortable: true },
  { name: 'belowMin', label: 'Por Debajo del Mínimo (Alerta)', field: 'belowMin', align: 'center' as const, sortable: true },
  { name: 'inRange', label: 'Rango Óptimo (Sano)', field: 'inRange', align: 'center' as const, sortable: true },
  { name: 'aboveMax', label: 'Por Encima del Máximo (Exceso)', field: 'aboveMax', align: 'center' as const, sortable: true },
  { name: 'totalItems', label: 'Total de Productos', field: 'totalItems', align: 'center' as const, sortable: true }
]

onMounted(() => {
  fetchMinMaxReport()
})
</script>

