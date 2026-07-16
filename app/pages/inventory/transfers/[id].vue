<template>
  <q-page padding>
    <div v-if="loading" class="row justify-center q-pa-xl">
      <q-spinner color="primary" size="3em" />
    </div>

    <div v-else-if="transfer">
      <!-- HEADER -->
      <div class="row items-center justify-between q-mb-md">
        <div class="row items-center">
          <q-btn flat round icon="arrow_back" color="primary" to="/inventory/transfers" class="q-mr-sm" :disable="isEditing" />
          <div class="text-h4 text-weight-bold text-primary">Transferencia #{{ transfer.id }}</div>
          <q-btn flat round dense color="secondary" icon="print" class="q-ml-md" @click="openReport(transfer.id)" v-if="!isEditing">
            <q-tooltip>Imprimir Acta</q-tooltip>
          </q-btn>
          <q-chip :color="getStatusColor(transfer.status)" text-color="white" class="q-ml-md" v-if="!isEditing">
            {{ getStatusLabel(transfer.status) }}
          </q-chip>
          <q-chip color="orange" text-color="white" class="q-ml-md" v-else icon="edit">
            Modo Edición
          </q-chip>
        </div>
        
        <!-- MÁQUINA DE ESTADO / BOTONES -->
        <div class="q-gutter-sm" v-if="!isEditing">
          <!-- Botón de Edición -->
          <q-btn v-if="canEdit" color="grey-8" outline icon="edit" label="Editar Detalles" @click="enableEdit" :loading="saving" />

          <template v-if="transfer.status === 'DRAFT'">
            <q-btn color="negative" flat icon="delete" label="Descartar" @click="deleteDraft" :loading="saving" />
            <q-btn color="orange-8" icon="send" label="Solicitar Aprobación" @click="updateStatus('PENDING')" :loading="saving" />
          </template>
          
          <template v-if="transfer.status === 'PENDING' && canApprove">
            <q-btn color="negative" icon="close" label="Rechazar" outline @click="promptReject" :loading="saving" />
            <q-btn color="blue-8" icon="local_shipping" label="Aprobar y Enviar" @click="updateStatus('APPROVED')" :loading="saving" />
          </template>
          
          <template v-if="transfer.status === 'APPROVED' && canConfirmReception">
            <q-btn color="green-8" icon="done_all" label="Confirmar Recepción" @click="updateStatus('CONFIRMED')" :loading="saving" />
          </template>
        </div>
      </div>

      <!-- METADATA -->
      <div class="row q-col-gutter-md q-mb-md">
        <div class="col-12 col-md-4">
          <q-card bordered flat>
            <q-card-section>
              <div class="text-caption text-grey">Origen</div>
              <div class="text-body1 text-weight-bold text-primary"><q-icon name="store" class="q-mr-sm"/>{{ transfer.source?.name || 'Central' }}</div>
            </q-card-section>
          </q-card>
        </div>
        <div class="col-12 col-md-4">
          <q-card bordered flat>
            <q-card-section>
              <div class="text-caption text-grey">Destino (Cocina)</div>
              <div class="text-body1 text-weight-bold text-orange-8"><q-icon name="restaurant" class="q-mr-sm"/>{{ transfer.destination?.name || 'No especificado' }}</div>
            </q-card-section>
          </q-card>
        </div>
        <div class="col-12 col-md-4">
          <q-card bordered flat>
            <q-card-section class="row justify-between items-center">
              <div>
                <div class="text-caption text-grey">Fecha</div>
                <div class="text-body1 text-weight-bold">{{ new Date(transfer.createdAt).toLocaleString() }}</div>
              </div>
              <q-toggle v-model="showPrices" label="Ver Precios" />
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- BUSCADOR MODO EDICIÓN (REMOVIDO, AHORA ES INLINE) -->
      <q-card bordered flat class="q-mb-md" v-if="isEditing">
        <q-card-section class="bg-orange-1 text-orange-10 row items-center">
          <q-icon name="info" size="sm" class="q-mr-sm" /> Estás editando esta transferencia. Las filas vacías serán ignoradas al guardar.
        </q-card-section>
      </q-card>

      <!-- DETALLES (PRODUCTOS) -->
      <q-card bordered flat>
        <q-table
          :grid="$q.screen.lt.md"
          :rows="transferItems"
          :columns="columns"
          row-key="productId"
          flat
          hide-pagination
          :pagination="{ rowsPerPage: 0 }"
        >
          <!-- Modo Edición: Código -->
          <template v-slot:body-cell-code="props">
            <q-td :props="props">
              {{ props.row.productCode }}
            </q-td>
          </template>

          <!-- Modo Edición: Producto (Buscador Inline) -->
          <template v-slot:body-cell-product="props">
            <q-td :props="props">
              <template v-if="props.row.isNew && !props.row.productId">
                <q-select
                  v-model="props.row.selectedProduct"
                  :options="activeProducts"
                  option-label="name"
                  use-input
                  fill-input
                  hide-selected
                  input-debounce="0"
                  @filter="filterProducts"
                  @update:model-value="(val) => onProductSelect(props.row, val)"
                  dense outlined
                  label="Seleccionar Producto"
                  style="min-width: 250px"
                >
                  <template v-slot:no-option>
                    <q-item><q-item-section class="text-grey">Sin resultados</q-item-section></q-item>
                  </template>
                </q-select>
              </template>
              <template v-else>
                {{ props.row.productName }}
              </template>
            </q-td>
          </template>

          <!-- Modo Edición: Cantidad -->
          <template v-slot:body-cell-quantity="props">
            <q-td :props="props">
              <template v-if="isEditing">
                <q-input 
                  v-model.number="props.row.quantity" 
                  type="number" 
                  dense outlined 
                  style="max-width: 120px; margin: 0 auto;"
                  :min="1"
                  :max="props.row.availableStock"
                  :rules="[
                    val => val > 0 || 'Inválido',
                    val => val <= props.row.availableStock || `Max ${props.row.availableStock}`
                  ]"
                  hide-bottom-space
                  :hint="props.row.productId ? `Stock: ${props.row.availableStock} ${props.row.unit}` : ''"
                  @update:model-value="(val) => { 
                    if (val < 1) props.row.quantity = 1; 
                    if (val > props.row.availableStock) props.row.quantity = props.row.availableStock; 
                  }"
                  :disable="props.row.isNew && !props.row.productId"
                />
              </template>
              <template v-else>
                {{ props.row.quantity }}
              </template>
            </q-td>
          </template>

          <!-- Acciones (Borrar Fila) -->
          <template v-slot:body-cell-actions="props">
            <q-td :props="props" class="text-right">
              <q-btn flat round dense color="negative" icon="delete" @click="removeItem(transferItems.indexOf(props.row))">
                <q-tooltip>Eliminar fila</q-tooltip>
              </q-btn>
            </q-td>
          </template>

          <!-- Modo Edición: Precio -->
          <template v-slot:body-cell-price="props">
            <q-td :props="props">
              <template v-if="isEditing">
                <q-input v-model.number="props.row.unitPrice" type="number" dense outlined prefix="$" style="max-width: 120px; margin: 0 auto;"/>
              </template>
              <template v-else>
                ${{ props.row.unitPrice }}
              </template>
            </q-td>
          </template>

          <!-- MODO MÓVIL (GRID): Tarjeta Detalles Transacción -->
          <template v-slot:item="props">
            <div class="q-pa-xs col-12 col-sm-6">
              <q-card bordered flat class="bg-white">
                <q-card-section class="q-pb-none row items-start justify-between">
                  <div class="text-weight-bold" style="max-width: 80%; line-height: 1.1;">
                    <template v-if="props.row.isNew && !props.row.productId">
                      <q-select
                        v-model="props.row.selectedProduct"
                        :options="activeProducts"
                        option-label="name"
                        use-input
                        fill-input
                        hide-selected
                        input-debounce="0"
                        @filter="filterProducts"
                        @update:model-value="(val) => onProductSelect(props.row, val)"
                        dense outlined
                        label="Seleccionar Producto"
                      />
                    </template>
                    <template v-else>
                      {{ props.row.productName }}
                    </template>
                  </div>
                  <q-btn v-if="isEditing" flat round dense color="negative" icon="delete" size="sm" @click="removeItem(transferItems.indexOf(props.row))" />
                </q-card-section>
                
                <q-card-section class="q-pt-sm row items-center justify-between">
                  <div v-if="isEditing" style="width: 100%" class="row justify-between items-end">
                    <div class="text-caption text-grey-8 self-center" v-if="props.row.productId">Stock: {{ props.row.availableStock }} {{ props.row.unit }}</div>
                    <q-input 
                      v-model.number="props.row.quantity" 
                      type="number" 
                      dense outlined 
                      style="width: 100px; margin-left: auto;"
                      :min="1"
                      :max="props.row.availableStock"
                      :rules="[
                        val => val > 0 || 'Inválido',
                        val => val <= props.row.availableStock || 'Max excedido'
                      ]"
                      hide-bottom-space
                      @update:model-value="(val) => { 
                        if (val < 1) props.row.quantity = 1; 
                        if (val > props.row.availableStock) props.row.quantity = props.row.availableStock; 
                      }"
                      :disable="props.row.isNew && !props.row.productId"
                    />
                  </div>
                  <div v-else class="text-weight-bold text-subtitle1">
                    {{ props.row.quantity }} {{ props.row.unit }}
                  </div>
                </q-card-section>
                
                <q-card-section v-if="transfer.type === 'TRANSFER' && showPrices" class="q-pt-none row justify-between text-caption text-grey-8">
                  <div>Precio Unitario</div>
                  <div v-if="isEditing" style="max-width: 100px">
                     <q-input v-model.number="props.row.unitPrice" type="number" dense outlined prefix="$" />
                  </div>
                  <div v-else>${{ props.row.unitPrice }}</div>
                </q-card-section>
              </q-card>
            </div>
          </template>
        </q-table>
        
        <q-card-section v-if="isEditing" class="q-pa-md">
          <div class="row">
            <q-btn flat color="primary" icon="add" label="Agregar Fila en Blanco" @click="addProductRow" />
          </div>
        </q-card-section>
        
        <!-- BARRA DE GUARDADO -->
        <q-separator v-if="isEditing" />
        <q-card-actions align="right" class="q-pa-md" v-if="isEditing">
          <q-btn flat label="Cancelar Edición" color="grey" @click="cancelEdit" :disable="saving" />
          <q-btn color="primary" icon="save" label="Guardar Cambios" @click="saveChanges" :loading="saving" />
        </q-card-actions>
      </q-card>

    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useTransferDetails } from '~/composables/features/useTransferDetails'

const {
  transfer, loading, saving, showPrices, isEditing, transferItems,
  canApprove, canEdit, canConfirmReception, columns, getCentralStock,
  updateStatus, promptReject, deleteDraft, enableEdit, cancelEdit, addProductRow, removeItem, saveChanges,
  getStatusColor, getStatusLabel 
} = useTransferDetails()

import { ref } from 'vue'
import { useProductsStore } from '~/stores/products'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const productsStore = useProductsStore()
const activeProducts = ref<any[]>([])

const getAvailableProducts = () => {
  // Obtenemos los IDs de los productos ya seleccionados
  const selectedIds = transferItems.value.map(item => item.productId).filter(id => id !== null)
  // Devolvemos solo los productos que NO estén en la lista
  return productsStore.products.filter(p => p.active && !selectedIds.includes(p.id))
}

const filterProducts = (val: string, update: any) => {
  const available = getAvailableProducts()
  if (val === '') {
    update(() => {
      activeProducts.value = available
    })
    return
  }
  update(() => {
    const needle = val.toLowerCase()
    activeProducts.value = available.filter(p => (p.name.toLowerCase().includes(needle) || p.code.toLowerCase().includes(needle)))
  })
}

const onProductSelect = (row: any, product: any) => {
  if (product) {
    // Validar por si acaso se cuela una selección
    const exists = transferItems.value.find(item => item.productId === product.id && item !== row)
    if (exists) {
      $q.notify({ type: 'warning', message: 'Este producto ya está en la transferencia. Ajusta su cantidad en lugar de agregarlo de nuevo.' })
      row.selectedProduct = null
      return
    }

    row.productId = product.id
    row.productName = product.name
    row.productCode = product.code
    row.unit = product.unit?.abbreviation || 'UN'
    row.availableStock = getCentralStock(product.id)
    row.unitPrice = Number(product.referencePrice) || 0
  }
}

const openReport = (id: number) => {
  window.open(`/inventory/transfers/report-${id}`, '_blank')
}
</script>
