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
      <q-banner v-if="transaction.status !== 'CONFIRMED'" class="bg-grey-3 text-grey-8 text-center text-h5 text-weight-bold q-mb-lg border rounded-borders">
        <q-icon name="warning" size="md" class="q-mr-sm" />
        DOCUMENTO NO CONFIRMADO (BORRADOR)
      </q-banner>

      <!-- HEADER -->
      <div class="text-center q-mb-lg">
        <div class="text-h4 text-weight-bold">ACTA DE RECEPCIÓN DE MERCANCÍA</div>
        <div class="text-subtitle1">SISTEMA INTEGRAL DE ALMACENES DE COMEDORES (SIAC)</div>
      </div>

      <div class="row justify-between q-mb-lg">
        <div class="col-6">
          <div><span class="text-weight-bold">ID de Transacción:</span> #REC-{{ transaction.id }}</div>
          <div><span class="text-weight-bold">Fecha de Ingreso:</span> {{ new Date(transaction.createdAt).toLocaleString() }}</div>
          <div><span class="text-weight-bold">Almacén Destino:</span> {{ transaction.destination?.name || 'Central' }}</div>
        </div>
        <div class="col-6 text-right">
          <div><span class="text-weight-bold">Proveedor:</span> {{ transaction.supplier?.name || 'Desconocido' }}</div>
          <div><span class="text-weight-bold">N° Factura / Guía:</span> {{ transaction.referenceNumber || 'N/A' }}</div>
          <div><span class="text-weight-bold">Operador Responsable:</span> {{ transaction.createdBy?.name || 'Desconocido' }}</div>
        </div>
      </div>

      <q-separator class="q-mb-md" color="black" />

      <!-- EXECUTIVE SUMMARY -->
      <q-card flat bordered :class="hasDiscrepancies ? 'bg-amber-1' : 'bg-green-1'" class="q-mb-lg">
        <q-card-section>
          <div class="text-h6 text-weight-bold q-mb-sm">
            <q-icon :name="hasDiscrepancies ? 'warning' : 'check_circle'" size="sm" class="q-mr-sm" />
            ESTADO FINAL: {{ hasDiscrepancies ? 'RECEPCIÓN CON NOVEDADES (FALTANTES)' : 'RECEPCIÓN CONFORME (100% ÉXITO)' }}
          </div>
          <div v-if="hasDiscrepancies">
            La mercancía fue procesada, pero se detectaron discrepancias entre la guía de despacho y el conteo físico. Se requiere revisión de las mermas reportadas.
          </div>
          <div v-else>
            La mercancía fue procesada y se verificó que el 100% de los productos facturados ingresaron físicamente al almacén sin daños ni faltantes.
          </div>
        </q-card-section>
      </q-card>

      <!-- DETALLE DE MERCANCIA -->
      <div class="text-subtitle1 text-weight-bold q-mb-sm">DETALLE DE MERCANCÍA VERIFICADA</div>
      
      <q-markup-table flat bordered separator="cell" class="q-mb-lg bg-white text-black">
        <thead class="bg-grey-2">
          <tr>
            <th class="text-left">Cód</th>
            <th class="text-left">Producto</th>
            <th class="text-center">Cant. Facturada</th>
            <th class="text-center">Cant. Recibida</th>
            <th class="text-center">Diferencia</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="det in transaction.details" :key="det.id">
            <td class="text-left">{{ det.product?.code }}</td>
            <td class="text-left">{{ det.product?.name }}</td>
            <td class="text-center">{{ Number(det.expectedQuantity || det.quantity) }} {{ det.product?.unit?.abbreviation }}</td>
            <td class="text-center text-weight-bold">{{ Number(det.quantity) }} {{ det.product?.unit?.abbreviation }}</td>
            <td class="text-center" :class="Number(det.quantity) < Number(det.expectedQuantity || det.quantity) ? 'text-red text-weight-bold' : ''">
              {{ Number(det.quantity) - Number(det.expectedQuantity || det.quantity) }}
            </td>
          </tr>
        </tbody>
      </q-markup-table>

      <!-- RESUMEN CUANTITATIVO -->
      <div class="row q-mb-xl">
        <div class="col-12 col-sm-6">
          <div class="text-subtitle2 text-weight-bold q-mb-md">RESUMEN CUANTITATIVO (DESGLOSE POR UNIDAD)</div>
          <div v-for="total in totalsByUnit" :key="total.unit" class="q-pl-md q-mb-sm">
            <div class="text-weight-bold">{{ total.unit === 'UN' ? 'UNIDADES' : total.unit }}</div>
            <div class="q-pl-md text-body2">
              <div><span class="text-weight-bold">Esperados:</span> {{ total.expected }}</div>
              <div><span class="text-weight-bold">Ingresados:</span> {{ total.received }}</div>
              <div v-if="total.difference > 0" class="text-red text-weight-bold">Mermas / Faltantes: {{ total.difference }}</div>
              <div v-else class="text-grey-7">Mermas / Faltantes: 0</div>
            </div>
          </div>
        </div>
      </div>

      <!-- FIRMAS -->
      <div class="q-mt-xl q-pt-xl">
        <div class="text-center q-mb-xl text-caption text-grey-8">
          Con las firmas expuestas a continuación, se da fe de que el conteo físico detallado en este documento es exacto y se acepta la entrada oficial de los materiales al inventario del almacén.
        </div>
        
        <div class="row justify-between text-center q-mt-xl q-pt-xl q-col-gutter-y-xl">
          <!-- Primera Fila (3 Firmas) -->
          <div class="col-4">
            <q-separator color="black" class="q-mb-sm q-mx-md" />
            <div class="text-weight-bold">Entregado Por</div>
            <div class="text-caption">Nombre, Cédula y Firma</div>
          </div>
          <div class="col-4">
            <q-separator color="black" class="q-mb-sm q-mx-md" />
            <div class="text-weight-bold">Recibido Por</div>
            <div class="text-caption">{{ transaction.createdBy?.name || 'Firma y Sello' }}</div>
          </div>
          <div class="col-4">
            <q-separator color="black" class="q-mb-sm q-mx-md" />
            <div class="text-weight-bold">Aprobado Por</div>
            <div class="text-caption">{{ transaction.approvedBy?.name || 'Firma y Sello' }}</div>
          </div>

          <!-- Segunda Fila (2 Firmas Centradas) -->
          <div class="col-4 offset-2">
            <q-separator color="black" class="q-mb-sm q-mx-md" />
            <div class="text-weight-bold">Revisado Por (PCP)</div>
            <div class="text-caption">Firma y Sello</div>
          </div>
          <div class="col-4">
            <q-separator color="black" class="q-mb-sm q-mx-md" />
            <div class="text-weight-bold">Revisado Por (GNB)</div>
            <div class="text-caption">Firma y Sello</div>
          </div>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useReceptionReport } from '~/composables/features/useReceptionReport'
import { useReceptionPdfMake } from '~/composables/features/useReceptionPdfMake'

definePageMeta({
  layout: 'blank'
})

const {
  transaction,
  loading,
  hasDiscrepancies,
  totalExpected,
  totalReceived,
  totalsByUnit,
  closeTab
} = useReceptionReport()

const { downloadPdf, isGenerating } = useReceptionPdfMake()

const printReport = async () => {
  if (!transaction.value) return
  await downloadPdf(
    transaction.value, 
    hasDiscrepancies.value, 
    totalExpected.value, 
    totalReceived.value,
    totalsByUnit.value
  )
}
</script>

<style scoped>
/* Print CSS: Quasar no tiene utilidad nativa para @page, así que esto es la única excepción permitida */
@media print {
  .hide-on-print {
    display: none !important;
  }
  @page {
    margin: 1.5cm;
    size: A4 portrait;
  }
}
</style>
