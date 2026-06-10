<template>
  <q-page padding>
    <div class="row items-center justify-between q-mb-md">
      <div class="text-h4 text-weight-bold text-primary">Recepciones</div>
      <q-btn color="primary" icon="add" label="Nueva Recepción" to="/inventory/receptions/import" />
    </div>

    <q-table
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
          <q-btn flat round dense color="primary" icon="visibility" @click="viewDetails(props.row.id)">
            <q-tooltip>Ver Detalles</q-tooltip>
          </q-btn>
        </q-td>
      </template>
    </q-table>
  </q-page>
</template>

<script setup lang="ts">
import { useReceptionsList } from '~/composables/features/useReceptionsList'

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
