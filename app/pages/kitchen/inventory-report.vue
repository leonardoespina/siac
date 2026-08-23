<template>
  <q-page class="report-page bg-white text-black">
    <!-- Controles superiores (Ocultos al imprimir) -->
    <div class="print-controls q-pa-md bg-grey-2 flex justify-between items-center hide-on-print">
      <div>
        <q-btn flat icon="close" label="Cerrar Pestaña" color="primary" @click="closeTab" />
      </div>
      <div>
        <q-btn color="primary" icon="download" label="Descargar PDF (Vectorial)" @click="printReport" class="q-mr-sm" :loading="isGenerating" />
      </div>
    </div>

    <!-- Spinner de carga -->
    <div v-if="loading" class="flex flex-center q-pa-xl">
      <q-spinner color="primary" size="3em" />
    </div>

    <!-- Contenido del Reporte -->
    <div v-else class="q-pa-lg bg-white text-black" style="max-width: 900px; margin: 0 auto;">
      
      <!-- HEADER -->
      <div class="text-center q-mb-lg">
        <div class="text-h4 text-weight-bold">REPORTE DE INVENTARIO FÍSICO</div>
        <div class="text-subtitle1">SISTEMA INTEGRAL DE ALMACENES DE COMEDORES (SIAC)</div>
      </div>

      <!-- INFO BLOQUE -->
      <div class="row justify-between q-mb-lg">
        <div class="col-6">
          <div><span class="text-weight-bold">Comedor / Almacén:</span> {{ assignedWarehouseName }}</div>
          <div><span class="text-weight-bold">Fecha del Reporte:</span> {{ new Date().toLocaleString() }}</div>
          <div><span class="text-weight-bold">Operador Responsable:</span> {{ authStore.user?.name || 'Desconocido' }}</div>
        </div>
        <div class="col-6 text-right">
          <div><span class="text-weight-bold">Total en Catálogo:</span> {{ stats.totalItems }} productos</div>
          <div><span class="text-weight-bold">Con Existencia:</span> {{ stats.inStock }} productos</div>
          <div><span class="text-weight-bold">Agotados:</span> {{ stats.outOfStock }} productos</div>
        </div>
      </div>

      <q-separator class="q-mb-md" color="black" />

      <!-- DETALLE DE STOCK VIGENTE -->
      <div class="text-subtitle1 text-weight-bold q-mb-sm">DETALLE DE STOCK VIGENTE</div>
      
      <q-markup-table flat bordered separator="cell" class="q-mb-lg bg-white text-black">
        <thead class="bg-grey-2">
          <tr>
            <th class="text-left">Cód</th>
            <th class="text-left">Producto</th>
            <th class="text-left">Categoría</th>
            <th class="text-center">Stock Disponible</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in inventoryList" :key="item.id">
            <td class="text-left">{{ item.code }}</td>
            <td class="text-left">{{ item.name }}</td>
            <td class="text-left">{{ item.category?.name || 'Sin Categoría' }}</td>
            <td class="text-center text-weight-bold" :class="item.localStock <= 0 ? 'text-red' : ''">
              {{ item.localStock > 0 ? `${item.localStock} ${item.unit?.abbreviation || 'UN'}` : 'AGOTADO' }}
            </td>
          </tr>
          <tr v-if="inventoryList.length === 0">
            <td colspan="4" class="text-center text-grey-6 q-pa-md">
              No hay productos con stock registrado en este almacén.
            </td>
          </tr>
        </tbody>
      </q-markup-table>

      <!-- FIRMAS -->
      <div class="q-mt-xl q-pt-xl">
        <div class="text-center q-mb-xl text-caption text-grey-8">
          El presente documento da fe de la existencia física de la mercancía registrada en este comedor/almacén a la fecha de emisión del reporte.
        </div>
        
        <div class="row justify-between text-center q-mt-xl q-pt-xl q-col-gutter-y-xl">
          <div class="col-4">
            <q-separator color="black" class="q-mb-sm q-mx-md" />
            <div class="text-weight-bold">Generado Por</div>
            <div class="text-caption">{{ authStore.user?.name || 'Nombre, Cédula y Firma' }}</div>
          </div>
          <div class="col-4">
            <q-separator color="black" class="q-mb-sm q-mx-md" />
            <div class="text-weight-bold">Auditado Por (PCP)</div>
            <div class="text-caption">Firma y Sello</div>
          </div>
          <div class="col-4">
            <q-separator color="black" class="q-mb-sm q-mx-md" />
            <div class="text-weight-bold">Validado Por (GNB)</div>
            <div class="text-caption">Firma y Sello</div>
          </div>
        </div>
      </div>

    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useAuthStore } from '~/stores/auth'
import { useKitchenInventory } from '~/composables/features/useKitchenInventory'
import { useInventoryPdfMake } from '~/composables/features/useInventoryPdfMake'

definePageMeta({
  layout: 'blank'
})

const route = useRoute()
const authStore = useAuthStore()

const {
  loading,
  activeWarehouseId,
  assignedWarehouseName,
  inventoryList,
  stats
} = useKitchenInventory()

// Ajustar el warehouseId de manera reactiva desde el query param de la URL
if (route.query.warehouseId) {
  activeWarehouseId.value = Number(route.query.warehouseId)
}

const { downloadPdf, isGenerating } = useInventoryPdfMake()

const printReport = async () => {
  if (!inventoryList.value) return
  const operatorName = authStore.user?.name || 'Operador SIAC'
  await downloadPdf(
    assignedWarehouseName.value,
    operatorName,
    inventoryList.value,
    stats.value
  )
}

const closeTab = () => {
  window.close()
}
</script>

<style scoped>
@media print {
  .hide-on-print {
    display: none !important;
  }
  .report-page {
    padding: 0 !important;
  }
  @page {
    margin: 1.5cm;
    size: A4 portrait;
  }
}
</style>
