<template>
  <q-page padding>
    <div class="row items-center justify-between q-mb-lg">
      <div class="text-h4 text-weight-bold text-primary">
        <q-icon name="fact_check" class="q-mr-sm" /> Aprobaciones de Consumo
      </div>
    </div>

    <div v-if="loading" class="row justify-center q-pa-xl">
      <q-spinner color="primary" size="3em" />
    </div>

    <div v-else>
      <q-card bordered flat class="q-mb-lg" v-if="pendingConsumptions.length === 0">
        <q-card-section class="text-center text-grey-6 q-pa-xl">
          <q-icon name="task_alt" size="64px" color="grey-4" class="q-mb-md block q-mx-auto" />
          <div class="text-h6">Todo al día</div>
          <div>No hay consumos ni mermas pendientes de aprobación en este momento.</div>
        </q-card-section>
      </q-card>

      <q-list bordered separator v-else class="bg-white rounded-borders">
        <q-expansion-item 
          v-for="tx in pendingConsumptions" 
          :key="tx.id" 
          group="approvals"
          header-class="bg-grey-1"
        >
          <template v-slot:header>
            <q-item-section avatar>
              <q-avatar 
                :color="tx.type === 'CONSUMPTION' ? 'blue-2' : (tx.type === 'SUPPORT' ? 'purple-2' : 'red-2')" 
                :text-color="tx.type === 'CONSUMPTION' ? 'blue-9' : (tx.type === 'SUPPORT' ? 'purple-9' : 'red-9')" 
                :icon="tx.type === 'CONSUMPTION' ? 'restaurant' : (tx.type === 'SUPPORT' ? 'volunteer_activism' : 'delete_sweep')" 
              />
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-weight-bold text-subtitle1">
                {{ tx.source?.name }} - {{ tx.type === 'CONSUMPTION' ? 'Consumo Diario' : (tx.type === 'SUPPORT' ? 'Apoyo Institucional' : 'Reporte de Merma') }} #{{ tx.id }}
              </q-item-label>
              <q-item-label v-if="tx.type === 'SUPPORT'" class="text-purple-9 text-weight-bold q-mt-xs">
                <q-icon name="account_balance" class="q-mr-xs" /> {{ tx.institution?.name || 'Institución no especificada' }}
              </q-item-label>
              <q-item-label caption class="q-mt-xs">
                Registrado por: <strong>{{ tx.createdBy?.name }}</strong> | 
                Fecha: {{ new Date(tx.createdAt).toLocaleString() }}
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <div class="row q-gutter-sm">
                <q-btn color="negative" outline label="Rechazar" icon="close" @click.stop="reject(tx.id)" :loading="processing" />
                <q-btn color="positive" label="Aprobar" icon="check" @click.stop="approve(tx.id)" :loading="processing" />
              </div>
            </q-item-section>
          </template>

          <q-card>
            <q-card-section class="bg-grey-2">
              <div class="text-subtitle2 text-grey-8 q-mb-sm">Detalle de Productos a Descontar:</div>
              <q-markup-table flat bordered dense class="bg-white">
                <thead>
                  <tr class="bg-grey-3">
                    <th class="text-left">Cód.</th>
                    <th class="text-left">Producto</th>
                    <th class="text-right">Cantidad Solicitada</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="det in tx.details" :key="det.id">
                    <td class="text-left">{{ det.product.code }}</td>
                    <td class="text-left">{{ det.product.name }}</td>
                    <td class="text-right text-weight-bold text-negative">
                      - {{ det.quantity }} {{ det.product.unit.abbreviation }}
                    </td>
                  </tr>
                </tbody>
              </q-markup-table>
            </q-card-section>
          </q-card>
        </q-expansion-item>
      </q-list>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useKitchenApprovals } from '~/composables/features/useKitchenApprovals'

const { loading, processing, pendingConsumptions, approve, reject } = useKitchenApprovals()
</script>
