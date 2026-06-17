<template>
  <q-page padding>
    <div class="row items-center q-mb-md">
      <q-btn flat round icon="arrow_back" color="primary" @click="$router.push('/reports')" class="q-mr-sm" />
      <div class="text-h4 text-weight-bold text-primary">Valorización del Inventario</div>
    </div>

    <div v-if="loading" class="row justify-center q-pa-xl">
      <q-spinner color="primary" size="3em" />
    </div>

    <div v-else>
      <q-card bordered flat class="q-mb-xl bg-green-9 text-white text-center q-pa-md">
        <div class="text-subtitle1 text-green-2 text-uppercase text-weight-bold">Valor Total Global (Todo el Sistema)</div>
        <div class="text-h2 text-weight-bolder">${{ totalGlobalValue.toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</div>
        <div class="text-caption text-green-2 q-mt-sm">Basado en el último precio de compra (facturación) de cada producto</div>
      </q-card>

      <div class="row q-col-gutter-lg">
        <div class="col-12 col-md-6" v-for="wh in warehousesValue" :key="wh.warehouse.id">
          <q-card bordered flat class="full-height">
            <q-card-section :class="wh.warehouse.type === 'CENTRAL' ? 'bg-primary text-white' : 'bg-grey-2'">
              <div class="row justify-between items-center">
                <div class="text-h6 text-weight-bold">
                  <q-icon :name="wh.warehouse.type === 'CENTRAL' ? 'domain' : 'restaurant'" class="q-mr-sm" />
                  {{ wh.warehouse.name }}
                </div>
                <div class="text-h6">${{ wh.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</div>
              </div>
            </q-card-section>
            
            <q-list bordered separator v-if="wh.items.length > 0">
              <q-item v-for="item in wh.items.slice(0, 5)" :key="item.product.id">
                <q-item-section>
                  <q-item-label class="text-weight-bold">{{ item.product.name }}</q-item-label>
                  <q-item-label caption>Cant: {{ item.quantity }} {{ item.product.unit.abbreviation }} | Último Precio: ${{ Number(item.unitPrice).toFixed(2) }}</q-item-label>
                </q-item-section>
                <q-item-section side class="text-weight-bold text-black">
                  ${{ item.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 }) }}
                </q-item-section>
              </q-item>
              
              <q-item v-if="wh.items.length > 5" class="bg-grey-1 text-center">
                <q-item-section class="text-grey-7">
                  + {{ wh.items.length - 5 }} productos adicionales con valor
                </q-item-section>
              </q-item>
            </q-list>
            
            <q-card-section v-else class="text-center text-grey">
              Almacén vacío o sin productos valorizados
            </q-card-section>
          </q-card>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useReports } from '~/composables/features/useReports'

const { loading, totalGlobalValue, warehousesValue, fetchValueReport } = useReports()

onMounted(() => {
  fetchValueReport()
})
</script>
