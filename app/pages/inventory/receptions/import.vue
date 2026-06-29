<template>
  <q-page :class="[$q.screen.lt.sm ? 'q-pa-sm' : 'q-pa-lg']">
    <div class="row items-center q-mb-md">
      <q-btn flat round icon="arrow_back" color="primary" to="/inventory/receptions" class="q-mr-sm" />
      <div class="text-h4 text-weight-bold text-primary">Importar Recepción</div>
    </div>

    <!-- PASO 1: Subida y Configuración -->
    <q-card bordered flat class="q-mb-md">
      <q-card-section class="row q-col-gutter-md items-center">
        <div class="col-12 col-md-3">
          <q-select
            v-model="supplierId"
            :options="suppliersStore.suppliers"
            option-value="id"
            option-label="name"
            emit-value map-options
            label="Proveedor Origen *"
            outlined dense
          />
        </div>
        <div class="col-12 col-md-3">
          <q-input
            v-model="referenceNumber"
            label="N° Factura / Entrega *"
            outlined dense
          />
        </div>
        <div class="col-12 col-md-3">
          <q-select
            v-model="destinationId"
            :options="centralWarehouses"
            option-value="id"
            option-label="name"
            emit-value map-options
            label="Almacén Destino (Central) *"
            outlined dense
          />
        </div>
        <div class="col-12 col-md-3 text-center">
          <q-btn 
            color="primary" 
            icon="file_upload" 
            label="Cargar Excel" 
            size="lg"
            :class="['full-width', { 'q-mt-sm': $q.screen.lt.sm }]"
            outline
            @click="isUploaderOpen = true"
          />
        </div>
      </q-card-section>
    </q-card>

    <!-- PASO 2: Vista Previa -->
    <q-card bordered flat v-if="parsedRows.length > 0">
      <q-card-section class="row items-center justify-between bg-primary text-white">
        <div>
          <div class="text-h6">Vista Previa y Ajustes ({{ parsedRows.length }} filas)</div>
          <div class="text-subtitle2">Gran Total: <span class="text-weight-bold text-h5 text-warning q-ml-sm">${{ grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</span></div>
        </div>
        <q-btn 
          color="warning" 
          text-color="dark"
          icon="cloud_upload" 
          label="Guardar e Importar" 
          size="lg"
          :class="['q-ml-sm', { 'full-width q-ml-none q-mt-sm': $q.screen.lt.md }]"
          :loading="saving"
          :disable="!supplierId || !destinationId || !referenceNumber"
          @click="saveImport"
        />
      </q-card-section>
      
      <q-table
        :rows="parsedRows"
        :columns="columns"
        row-key="index"
        :filter="searchQuery"
        :grid="$q.screen.lt.md"
        flat
        :pagination="{ rowsPerPage: 15 }"
      >
        <template v-slot:top-right>
          <q-input borderless dense debounce="300" v-model="searchQuery" placeholder="Buscar producto...">
            <template v-slot:append>
              <q-btn flat round dense icon="camera_alt" color="amber-8" @click="isOcrOpen = true">
                <q-tooltip>Escanear Nombre con Cámara (OCR)</q-tooltip>
              </q-btn>
              <q-icon name="search" />
            </template>
          </q-input>
        </template>

        <!-- Vista de Tarjetas (Móviles / Tablets) -->
        <template v-slot:item="props">
          <div class="q-pa-xs col-12 col-sm-6 col-md-4">
            <q-card bordered flat :class="props.row.checked ? 'bg-green-1' : ''">
              <q-card-section class="row items-center justify-between q-pb-none">
                <div class="text-weight-bold ellipsis" style="max-width: 80%">{{ props.row.productName }}</div>
                <q-checkbox v-model="props.row.checked" color="positive" v-if="props.row.isValid" />
                <q-icon name="error" color="negative" size="sm" v-else>
                  <q-tooltip>{{ props.row.errorMsg }}</q-tooltip>
                </q-icon>
              </q-card-section>
              <q-card-section>
                <div class="text-caption text-grey">Categoría: {{ props.row.categoryName }} | Unidad: {{ props.row.unitName }}</div>
                <div class="row q-mt-sm q-col-gutter-sm">
                  <div class="col-4">
                    <q-input v-model.number="props.row.quantity" type="number" label="Cant." dense outlined readonly @update:model-value="revalidateRow(props.row)">
                      <q-tooltip>Modifique la cantidad en la siguiente pantalla (Borrador)</q-tooltip>
                    </q-input>
                  </div>
                  <div class="col-4">
                    <q-input v-model.number="props.row.unitPrice" type="number" label="Precio" dense outlined prefix="$" @update:model-value="revalidateRow(props.row)" />
                  </div>
                  <div class="col-4">
                    <q-input v-model="props.row.expirationDate" type="date" label="Vence" dense outlined @update:model-value="revalidateRow(props.row)" />
                  </div>
                </div>
              </q-card-section>
            </q-card>
          </div>
        </template>

        <!-- Vista de Tabla (Escritorio) -->
        <template v-slot:body-cell-status="props">
          <q-td :props="props" :class="props.row.checked ? 'bg-green-1' : ''">
            <q-checkbox v-model="props.row.checked" color="positive" v-if="props.row.isValid">
              <q-tooltip>Marcar como revisado</q-tooltip>
            </q-checkbox>
            <q-icon name="error" color="negative" size="sm" v-else>
              <q-tooltip>{{ props.row.errorMsg }}</q-tooltip>
            </q-icon>
          </q-td>
        </template>

        <!-- Edición en Vivo: Cantidad -->
        <template v-slot:body-cell-quantity="props">
          <q-td :props="props">
            <q-input 
              v-model.number="props.row.quantity" 
              type="number" 
              dense outlined 
              readonly
              style="max-width: 90px; margin: 0 auto"
              :color="props.row.quantity <= 0 ? 'negative' : 'primary'"
              @update:model-value="revalidateRow(props.row)"
            >
              <q-tooltip>Modifique la cantidad en la siguiente pantalla (Borrador)</q-tooltip>
            </q-input>
          </q-td>
        </template>

        <!-- Edición en Vivo: Precio -->
        <template v-slot:body-cell-unitPrice="props">
          <q-td :props="props">
            <q-input 
              v-model.number="props.row.unitPrice" 
              type="number" 
              dense outlined 
              prefix="$"
              style="max-width: 110px; margin: 0 auto"
              :color="props.row.unitPrice < 0 ? 'negative' : 'primary'"
              @update:model-value="revalidateRow(props.row)"
            />
          </q-td>
        </template>

        <!-- Edición en Vivo: Vencimiento -->
        <template v-slot:body-cell-expirationDate="props">
          <q-td :props="props">
            <q-input 
              v-model="props.row.expirationDate" 
              type="date" 
              dense outlined 
              style="max-width: 140px; margin: 0 auto"
              @update:model-value="revalidateRow(props.row)"
            />
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Modal Intuitivo de Carga -->
    <SharedExcelUploader 
      v-model="isUploaderOpen"
      :is-processing="isProcessing"
      :upload-progress="uploadProgress"
      @download-template="downloadTemplate"
      @file-selected="handleFileSelected"
    />

    <!-- Componente de Escáner OCR Reutilizable -->
    <SharedOcrCameraScanner v-model="isOcrOpen" @onDetect="handleOcrDetection" />
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import { useAuthStore } from '~/stores/auth'
import { useSuppliersStore } from '~/stores/suppliers'
import { useWarehousesStore } from '~/stores/warehouses'
import { useExcelImport } from '~/composables/features/useExcelImport'

const $q = useQuasar()
const router = useRouter()
const auth = useAuthStore()

// Protección de Ruta mediante Matriz de Permisos
if (!auth.hasPermission('RECEPTIONS', 'canCreate')) {
  router.push('/inventory/receptions')
}

const suppliersStore = useSuppliersStore()
const warehousesStore = useWarehousesStore()

const centralWarehouses = computed(() => {
  return warehousesStore.warehouses.filter(w => w.type === 'CENTRAL')
})

// ── LÓGICA DELEGADA AL COMPOSABLE ───────────────────────────────────────────
const { 
  file, 
  supplierId, 
  destinationId, 
  referenceNumber,
  parsedRows, 
  saving,
  isProcessing,
  uploadProgress,
  searchQuery,
  grandTotal,
  parseExcel, 
  saveImport,
  downloadTemplate,
  revalidateRow
} = useExcelImport()

const isUploaderOpen = ref(false)

const handleFileSelected = async (f: File) => {
  await parseExcel(f)
  isUploaderOpen.value = false // Cierra el modal cuando la animación llega a 100%
}

const columns = [
  { name: 'status', label: '', align: 'center', style: 'width: 50px' },
  { name: 'productCode', label: 'Código', field: 'productCode', align: 'left' },
  { name: 'productName', label: 'Producto', field: 'productName', align: 'left' },
  { name: 'categoryName', label: 'Categoría', field: 'categoryName', align: 'left' },
  { name: 'unitName', label: 'Unidad', field: 'unitName', align: 'center' },
  { name: 'quantity', label: 'Cant.', field: 'quantity', align: 'center' },
  { name: 'unitPrice', label: 'Precio', field: 'unitPrice', align: 'center' },
  { name: 'expirationDate', label: 'Vencimiento', field: 'expirationDate', align: 'center', format: (val: string) => val ? new Date(val).toLocaleDateString() : 'N/A' }
]

// === OCR ===
const isOcrOpen = ref(false)
const handleOcrDetection = (text: string) => {
  searchQuery.value = text
  isOcrOpen.value = false
  $q.notify({
    type: 'positive',
    message: `Detectado: ${text}`,
    position: 'top',
    timeout: 2000
  })
}

onMounted(async () => {
  await suppliersStore.fetchAll()
  await warehousesStore.fetchAll()
  
  // Auto-seleccionar el Almacén Central si es el único
  if (centralWarehouses.value.length === 1 && !destinationId.value) {
    destinationId.value = centralWarehouses.value[0].id
  }
})
</script>
