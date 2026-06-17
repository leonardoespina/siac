<template>
  <q-page padding>
    <div class="row items-center q-mb-md">
      <q-btn flat round icon="arrow_back" color="primary" @click="$router.push('/reports')" class="q-mr-sm" />
      <div class="text-h4 text-weight-bold text-primary">Alertas de Stop (Críticos)</div>
    </div>

    <div v-if="loading" class="row justify-center q-pa-xl">
      <q-spinner color="primary" size="3em" />
    </div>

    <div v-else-if="alerts.length === 0" class="row justify-center q-pa-xl text-center">
      <div>
        <q-icon name="check_circle" size="64px" color="positive" class="q-mb-md" />
        <div class="text-h5 text-grey-8">Todo está en orden</div>
        <div class="text-body1 text-grey-6">No hay alertas críticas de stock ni de vencimiento en los almacenes.</div>
      </div>
    </div>

    <div v-else>
      <q-card bordered flat class="q-mb-lg">
        <q-list bordered separator>
          <q-item v-for="alert in alerts" :key="alert.id" class="q-py-md">
            <q-item-section avatar>
              <q-avatar :color="alert.color" text-color="white" :icon="alert.icon" />
            </q-item-section>
            
            <q-item-section>
              <q-item-label class="text-weight-bold" :class="`text-${alert.color}`">{{ alert.message }}</q-item-label>
              <q-item-label class="text-h6 q-mt-xs">{{ alert.product.name }} ({{ alert.product.code }})</q-item-label>
              <q-item-label caption class="q-mt-xs">
                Ubicación: <span class="text-weight-bold">{{ alert.warehouse.name }}</span>
              </q-item-label>
            </q-item-section>

            <q-item-section side class="text-right">
              <div v-if="alert.type === 'EXPIRED' || alert.type.startsWith('EXPIRING')">
                <div class="text-caption text-grey">Fecha de Caducidad:</div>
                <div class="text-subtitle1 text-weight-bold" :class="`text-${alert.color}`">
                  {{ new Date(alert.limit).toLocaleDateString() }}
                </div>
                <div class="text-caption text-grey">Stock afectado: {{ alert.currentQty }} {{ alert.product.unit.abbreviation }}</div>
              </div>
              
              <div v-else>
                <div class="text-caption text-grey">Stock Actual vs Límite:</div>
                <div class="text-subtitle1 text-weight-bold" :class="`text-${alert.color}`">
                  {{ alert.currentQty }} / {{ alert.limit }} {{ alert.product.unit.abbreviation }}
                </div>
              </div>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useReports } from '~/composables/features/useReports'

const { loading, alerts, fetchAlertsReport } = useReports()

onMounted(() => {
  fetchAlertsReport()
})
</script>
