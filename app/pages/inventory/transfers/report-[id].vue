<template>
  <q-page class="report-page bg-white text-black">
    <div class="print-controls q-pa-md bg-grey-2 flex justify-between items-center hide-on-print">
      <div>
        <q-btn flat icon="close" label="Cerrar Pestaña" color="primary" @click="closeTab" />
      </div>
      <div>
        <q-btn color="primary" icon="download" label="Descargar PDF (Vectorial)" @click="printReport" class="q-mr-sm" :loading="isGenerating" />
      </div>
    </div>

    <div v-if="loading" class="flex flex-center q-pa-xl">
      <q-spinner color="primary" size="3em" />
    </div>

    <div v-else-if="transaction" class="q-pa-lg bg-white text-black" style="max-width: 900px; margin: 0 auto;">
      <!-- WATERMARK ALTERNATIVA NATIVA -->
      <q-banner v-if="transaction.status === 'DRAFT'" class="bg-grey-3 text-grey-8 text-center text-h5 text-weight-bold q-mb-lg border rounded-borders">
        <q-icon name="warning" size="md" class="q-mr-sm" />
        DOCUMENTO NO VÁLIDO PARA TRÁNSITO (BORRADOR)
      </q-banner>

      <!-- HEADER -->
      <div class="text-center q-mb-lg">
        <div class="text-h4 text-weight-bold">ACTA DE TRÁNSITO DE MERCANCÍA</div>
        <div class="text-subtitle1">SISTEMA INTEGRAL DE ALMACENES DE COMEDORES (SIAC)</div>
      </div>

      <div class="row justify-between q-mb-lg">
        <div class="col-6">
          <div><span class="text-weight-bold">ID de Transacción:</span> #TRN-{{ transaction.id }}</div>
          <div><span class="text-weight-bold">Fecha de Salida:</span> {{ new Date(transaction.createdAt).toLocaleString() }}</div>
          <div><span class="text-weight-bold">Almacén Origen:</span> {{ transaction.source?.name || 'Central' }}</div>
        </div>
        <div class="col-6 text-right">
          <div><span class="text-weight-bold">Almacén Destino:</span> {{ transaction.destination?.name || 'Desconocido' }}</div>
          <div><span class="text-weight-bold">N° Factura / Guía:</span> {{ transaction.referenceNumber || 'N/A' }}</div>
          <div><span class="text-weight-bold">Operador Despachador:</span> {{ transaction.createdBy?.name || 'Desconocido' }}</div>
        </div>
      </div>

      <q-separator class="q-mb-md" color="black" />

      <!-- DETALLE DE MERCANCIA -->
      <div class="text-subtitle1 text-weight-bold q-mb-sm">DETALLE DE MERCANCÍA DESPACHADA</div>
      
      <q-markup-table flat bordered separator="cell" class="q-mb-lg bg-white text-black">
        <thead class="bg-grey-2">
          <tr>
            <th class="text-left">Cód</th>
            <th class="text-left">Producto</th>
            <th class="text-center">Cant. Despachada</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="det in transaction.details" :key="det.id">
            <td class="text-left">{{ det.product?.code }}</td>
            <td class="text-left">{{ det.product?.name }}</td>
            <td class="text-center text-weight-bold">{{ Number(det.quantity) }} {{ det.product?.unit?.abbreviation }}</td>
          </tr>
        </tbody>
      </q-markup-table>

      <!-- RESUMEN CUANTITATIVO -->
      <div class="row q-mb-xl">
        <div class="col-12 col-sm-6">
          <div class="text-subtitle2 text-weight-bold q-mb-xs">RESUMEN CUANTITATIVO</div>
          <div class="q-pl-md">
            <div><span class="text-weight-bold">Total Unidades Despachadas:</span> {{ totalQuantity }} Unidades</div>
          </div>
        </div>
      </div>

      <!-- FIRMAS -->
      <div class="q-mt-xl q-pt-xl">
        <div class="text-center q-mb-xl text-caption text-grey-8">
          Con las firmas expuestas a continuación, se da fe de que los productos detallados en este documento salieron físicamente del Almacén de Origen y se encuentran en tránsito hacia el Destino.
        </div>
        
        <div class="row justify-between text-center q-mt-xl q-pt-xl">
          <div class="col-4 q-px-sm">
            <q-separator color="black" class="q-mb-sm" />
            <div class="text-weight-bold">Despachado Por</div>
            <div class="text-caption">{{ transaction.createdBy?.name || 'Nombre, Cédula y Firma' }}</div>
          </div>
          <div class="col-4 q-px-sm">
            <q-separator color="black" class="q-mb-sm" />
            <div class="text-weight-bold">Transportado Por (Chofer)</div>
            <div class="text-caption">Nombre, Cédula y Firma</div>
          </div>
          <div class="col-4 q-px-sm">
            <q-separator color="black" class="q-mb-sm" />
            <div class="text-weight-bold">Recibido Por (Destino)</div>
            <div class="text-caption">Firma y Sello</div>
          </div>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useTransferReport } from '~/composables/features/useTransferReport'
import { useTransferPdfMake } from '~/composables/features/useTransferPdfMake'

definePageMeta({
  layout: 'blank'
})

const {
  transaction,
  loading,
  totalQuantity,
  closeTab
} = useTransferReport()

const { downloadPdf, isGenerating } = useTransferPdfMake()

const printReport = async () => {
  if (!transaction.value) return
  await downloadPdf(
    transaction.value, 
    totalQuantity.value
  )
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
}
</style>
