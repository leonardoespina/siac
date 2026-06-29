<template>
  <q-page padding>
    <div class="row items-center justify-between q-mb-md">
      <div class="text-h4 text-weight-bold text-primary">Historial de Transferencias</div>
      <q-btn v-if="canCreate" color="primary" icon="add" label="Nueva Transferencia" to="/inventory/transfers/new" />
    </div>

    <q-card bordered flat>
      <q-table :grid="$q.screen.lt.md"
        :rows="transfers"
        :columns="columns"
        row-key="id"
        :loading="loading"
        flat
      >
        <template v-slot:body-cell-status="props">
          <q-td :props="props">
            <q-chip :color="getStatusColor(props.row.status)" text-color="white" dense size="sm">
              {{ getStatusLabel(props.row.status) }}
            </q-chip>
          </q-td>
        </template>
        <template v-slot:body-cell-actions="props">
          <q-td :props="props">
            <q-btn flat round color="primary" icon="visibility" :to="`/inventory/transfers/${props.row.id}`" />
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
                <q-btn flat color="primary" label="Ver Detalles" icon="visibility" :to="`/inventory/transfers/${props.row.id}`" />
              </q-card-actions>
            </q-card>
          </div>
        </template>
      </q-table>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useTransfersList } from '~/composables/features/useTransfersList'

const auth = useAuthStore()
const canCreate = computed(() => auth.hasPermission('TRANSFERS', 'canCreate'))

const { transfers, loading, columns, getStatusColor, getStatusLabel } = useTransfersList()
</script>

