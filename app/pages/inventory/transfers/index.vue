<template>
  <q-page padding>
    <div class="row items-center justify-between q-mb-md">
      <div class="text-h4 text-weight-bold text-primary">Historial de Transferencias</div>
      <q-btn color="primary" icon="add" label="Nueva Transferencia" to="/inventory/transfers/new" />
    </div>

    <q-card bordered flat>
      <q-table
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
      </q-table>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { useTransfersList } from '~/composables/features/useTransfersList'
const { transfers, loading, columns, getStatusColor, getStatusLabel } = useTransfersList()
</script>
