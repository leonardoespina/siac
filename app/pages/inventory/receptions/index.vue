<template>
  <q-page padding>
    <div class="row items-center justify-between q-mb-md">
      <div class="text-h4 text-weight-bold text-primary">Recepciones</div>
      <q-btn v-if="canCreate" color="primary" icon="add" label="Nueva Recepción" to="/inventory/receptions/import" />
    </div>

    <q-table :grid="$q.screen.lt.md"
      :rows="receptions"
      :columns="columns"
      row-key="id"
      :loading="loading"
      flat bordered
      :pagination="{ rowsPerPage: 10 }"
    >
      <template v-slot:body-cell-status="props">
        <q-td :props="props">
          <q-chip :color="getStatusColor(props.row.status)" text-color="white" dense size="sm">
            {{ getStatusLabel(props.row.status) }}
          </q-chip>
        </q-td>
      </template>

      <template v-slot:body-cell-actions="props">
        <q-td :props="props" class="text-right">
          <q-btn flat round dense color="secondary" icon="print" @click="openReport(props.row.id)">
            <q-tooltip>Imprimir Acta de Recepción</q-tooltip>
          </q-btn>
          <q-btn flat round dense color="primary" icon="visibility" @click="viewDetails(props.row.id)">
            <q-tooltip>Ver Detalles</q-tooltip>
          </q-btn>
        </q-td>
      </template>

      <!-- MODO GRID MÓVIL (Para mantener botones de acción y chips) -->
      <template v-slot:item="props">
        <div class="q-pa-xs col-12 col-sm-6 col-md-4">
          <q-card bordered flat>
            <q-card-section class="q-pb-none">
              <div v-for="col in props.cols.filter(c => c.name !== 'actions')" :key="col.name" class="row justify-between q-mb-sm">
                <div class="text-caption text-grey-7">{{ col.label }}</div>
                <div class="text-weight-bold text-right">
                  <template v-if="col.name === 'status'">
                    <q-chip :color="getStatusColor(props.row.status)" text-color="white" dense size="sm">
                      {{ getStatusLabel(props.row.status) }}
                    </q-chip>
                  </template>
                  <template v-else>
                    {{ col.value }}
                  </template>
                </div>
              </div>
            </q-card-section>
            <q-separator />
            <q-card-actions align="right">
              <q-btn flat color="secondary" label="Imprimir" icon="print" @click="openReport(props.row.id)" />
              <q-btn flat color="primary" label="Ver Detalles" icon="visibility" @click="viewDetails(props.row.id)" />
            </q-card-actions>
          </q-card>
        </div>
      </template>
    </q-table>
  </q-page>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '~/stores/auth'
import { useReceptionsList } from '~/composables/features/useReceptionsList'

const auth = useAuthStore()
const canCreate = computed(() => auth.hasPermission('RECEPTIONS', 'canCreate'))

const router = useRouter()
const openReport = (id: number) => {
  window.open(`/inventory/receptions/report-${id}`, '_blank')
}

// ── LÓGICA DELEGADA AL COMPOSABLE ───────────────────────────────────────────
const {
  receptions,
  loading,
  columns,
  viewDetails,
  getStatusColor,
  getStatusLabel
} = useReceptionsList()
</script>

