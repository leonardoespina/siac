<template>
  <q-page padding>
    <div class="row items-center q-mb-md">
      <q-btn flat round icon="arrow_back" color="primary" to="/inventory/transfers" class="q-mr-sm" />
      <div class="text-h4 text-weight-bold text-primary">Nueva Transferencia</div>
    </div>

    <div class="row q-col-gutter-md">
      <!-- PANEL IZQUIERDO: Buscador y Selección -->
      <div class="col-12 col-md-5">
        <q-card bordered flat class="q-mb-md">
          <q-card-section class="bg-grey-2">
            <div class="text-subtitle1 text-weight-bold">Configuración de Envío</div>
          </q-card-section>
          <q-card-section>
            <q-select
              v-model="sourceId"
              :options="availableSources"
              option-value="id"
              option-label="name"
              emit-value map-options
              label="Almacén de Origen *"
              outlined dense class="q-mb-md"
              color="primary"
            >
              <template v-slot:prepend><q-icon name="store" /></template>
            </q-select>

            <q-select
              v-model="destinationId"
              :options="availableDestinations"
              option-value="id"
              option-label="name"
              emit-value map-options
              label="Almacén de Destino *"
              outlined dense
              color="primary"
            >
              <template v-slot:prepend><q-icon name="restaurant" /></template>
            </q-select>
          </q-card-section>
        </q-card>

        <q-card bordered flat>
          <q-card-section class="bg-grey-2">
            <div class="text-subtitle1 text-weight-bold">Añadir Productos</div>
          </q-card-section>
          <q-card-section>
            <q-input v-model="searchQuery" outlined dense placeholder="Buscar producto por nombre o código..." class="q-mb-sm" clearable>
              <template v-slot:append>
                <q-btn flat round dense icon="camera_alt" color="amber-8" @click="isOcrOpen = true">
                  <q-tooltip>Escanear etiqueta (OCR)</q-tooltip>
                </q-btn>
                <q-icon name="search" />
              </template>
            </q-input>

            <q-table
              :grid="$q.screen.lt.md"
              :rows="filteredProducts"
              :columns="productColumns"
              row-key="id"
              flat bordered dense
              :pagination="{ rowsPerPage: 5 }"
            >
              <template v-slot:body-cell-stock="props">
                <q-td :props="props">
                  <q-badge :color="getStock(props.row.id, sourceId) > 0 ? 'green' : 'red'">
                    {{ getStock(props.row.id, sourceId) }} {{ props.row.unit?.abbreviation }}
                  </q-badge>
                </q-td>
              </template>
              <template v-slot:body-cell-qty="props">
                <q-td :props="props" class="text-right">
                  <q-input 
                    v-model.number="inputQuantities[props.row.id]"
                    type="number" 
                    dense 
                    outlined 
                    style="width: 70px; display: inline-block"
                    :min="1"
                    :max="getStock(props.row.id, sourceId)"
                    hide-bottom-space
                    @update:model-value="(val) => { 
                      if (!val || val < 1) inputQuantities[props.row.id] = 1; 
                      if (val > getStock(props.row.id, sourceId)) inputQuantities[props.row.id] = getStock(props.row.id, sourceId); 
                    }"
                  />
                </q-td>
              </template>
              <template v-slot:body-cell-actions="props">
                <q-td :props="props" class="text-right">
                  <q-btn flat round dense color="primary" icon="add" @click="addItem(props.row, inputQuantities[props.row.id] || 1)" />
                </q-td>
              </template>
              
              <!-- MODO MÓVIL (GRID): Tarjeta Buscador -->
              <template v-slot:item="props">
                <div class="q-pa-xs col-12 col-sm-6">
                  <q-card bordered flat class="bg-white">
                    <q-card-section class="q-pb-none row items-start justify-between">
                      <div class="text-weight-bold" style="max-width: 65%; line-height: 1.1;">{{ props.row.name }}</div>
                      <div class="row items-center q-gutter-x-xs">
                        <q-input 
                          v-model.number="inputQuantities[props.row.id]"
                          type="number" 
                          dense 
                          outlined 
                          style="width: 60px"
                          :min="1"
                          :max="getStock(props.row.id, sourceId)"
                          hide-bottom-space
                          @update:model-value="(val) => { 
                            if (!val || val < 1) inputQuantities[props.row.id] = 1; 
                            if (val > getStock(props.row.id, sourceId)) inputQuantities[props.row.id] = getStock(props.row.id, sourceId); 
                          }"
                        />
                        <q-btn flat round dense color="primary" icon="add" size="sm" @click="addItem(props.row, inputQuantities[props.row.id] || 1)" />
                      </div>
                    </q-card-section>
                    <q-card-section class="q-pt-sm q-pb-sm row justify-between text-caption">
                      <div class="text-grey-7">{{ props.row.code }}</div>
                      <div class="text-weight-medium">
                        Stock: 
                        <q-badge :color="getStock(props.row.id, sourceId) > 0 ? 'green' : 'red'">
                          {{ getStock(props.row.id, sourceId) }} {{ props.row.unit?.abbreviation }}
                        </q-badge>
                      </div>
                    </q-card-section>
                  </q-card>
                </div>
              </template>
            </q-table>
          </q-card-section>
        </q-card>
      </div>

      <!-- PANEL DERECHO: Cesta de Transferencia -->
      <div class="col-12 col-md-7">
        <q-card bordered flat>
          <q-card-section class="bg-grey-2 row justify-between items-center">
            <div class="text-subtitle1 text-weight-bold">Cesta de Envío</div>
            <q-toggle v-model="showPrices" label="Mostrar Precios" color="primary" />
          </q-card-section>

          <q-card-section v-if="transferItems.length === 0" class="text-center text-grey q-py-xl">
            <q-icon name="shopping_basket" size="4rem" color="grey-4" />
            <div class="text-h6 q-mt-md">La cesta está vacía</div>
            <p>Busca y selecciona productos en el panel izquierdo.</p>
          </q-card-section>

          <q-list separator v-else>
            <q-item v-for="(item, index) in transferItems" :key="item.productId" class="q-py-md">
              <q-item-section>
                <q-item-label class="text-weight-bold">{{ item.productName }}</q-item-label>
                <q-item-label caption>Stock Origen: {{ item.availableStock }} {{ item.unit }}</q-item-label>
              </q-item-section>

              <q-item-section style="max-width: 150px" v-if="showPrices">
                <q-input v-model.number="item.unitPrice" type="number" label="Precio" dense outlined prefix="$" />
              </q-item-section>

              <q-item-section style="max-width: 150px">
                <q-input 
                  v-model.number="item.quantity" 
                  type="number" 
                  label="Cantidad a enviar" 
                  dense 
                  outlined 
                  :suffix="item.unit"
                  :min="1"
                  :max="item.availableStock"
                  :rules="[
                    val => val > 0 || 'Inválido',
                    val => val <= item.availableStock || `Max ${item.availableStock}`
                  ]"
                  hide-bottom-space
                  @update:model-value="(val) => { 
                    if (val < 1) item.quantity = 1; 
                    if (val > item.availableStock) item.quantity = item.availableStock; 
                  }"
                />
              </q-item-section>

              <q-item-section side>
                <q-btn flat round color="negative" icon="delete" @click="removeItem(index)" />
              </q-item-section>
            </q-item>
          </q-list>

          <q-separator />
          
          <q-card-actions align="right" class="q-pa-md">
            <q-btn flat label="Cancelar" color="grey" to="/inventory/transfers" />
            <q-btn color="primary" icon="save" label="Guardar Borrador" @click="saveDraft" :loading="saving" :disable="transferItems.length === 0" />
          </q-card-actions>
        </q-card>
      </div>
    </div>

    <!-- Componente OCR Reutilizable -->
    <SharedOcrCameraScanner v-model="isOcrOpen" @onDetect="handleOcrDetection" />
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '~/stores/auth'
import { useTransferForm } from '~/composables/features/useTransferForm'
import { useWarehousesStore } from '~/stores/warehouses'
import { useProductsStore } from '~/stores/products'

const auth = useAuthStore()
const router = useRouter()

// Protección de Ruta mediante Matriz de Permisos
if (!auth.hasPermission('TRANSFERS', 'canCreate')) {
  router.push('/inventory/transfers')
}

const warehousesStore = useWarehousesStore()
const productsStore = useProductsStore()

onMounted(async () => {
  if (warehousesStore.warehouses.length === 0) await warehousesStore.fetchAll()
  if (productsStore.products.length === 0) await productsStore.fetchAll()
})

const {
  saving, sourceId, destinationId, searchQuery, transferItems, inputQuantities, showPrices,
  availableSources, availableDestinations, filteredProducts,
  getStock, addItem, removeItem, saveDraft
} = useTransferForm()

const productColumns = [
  { name: 'name', label: 'Producto', field: 'name', align: 'left' as const },
  { name: 'code', label: 'Código', field: 'code', align: 'left' as const },
  { name: 'stock', label: 'Stock Origen', field: 'stock', align: 'center' as const },
  { name: 'qty', label: 'Cant.', field: 'qty', align: 'right' as const },
  { name: 'actions', label: '', field: 'actions', align: 'right' as const }
]

// ── LÓGICA DE OCR ───────────────────────────────────────────────
const isOcrOpen = ref(false)
const handleOcrDetection = (text: string) => {
  searchQuery.value = text
  isOcrOpen.value = false
}
</script>
