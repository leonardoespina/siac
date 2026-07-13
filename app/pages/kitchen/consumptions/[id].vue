<template>
  <q-page padding>
    <div v-if="loading" class="row justify-center q-pa-xl">
      <q-spinner color="primary" size="3em" />
    </div>

    <div v-else-if="transfer">
      <!-- HEADER -->
      <div class="row items-center justify-between q-mb-md">
        <div class="row items-center">
          <q-btn flat round icon="arrow_back" color="primary" to="/kitchen/operation" class="q-mr-sm" :disable="isEditing" />
          <div class="text-h4 text-weight-bold text-primary">
            {{ transfer.type === 'CONSUMPTION' ? 'Consumo' : (transfer.type === 'SUPPORT' ? 'Apoyo Institucional' : 'Merma') }} #{{ transfer.id }}
          </div>
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
          <q-btn v-if="canEdit && transfer?.type !== 'SUPPORT'" color="positive" icon="check_circle" label="Aprobar Consumo" @click="approveConsumption" :loading="saving" />
          <q-btn v-if="canEdit" color="grey-8" outline icon="edit" label="Editar Detalles" @click="enableEdit" :loading="saving" />
          <q-btn v-if="canEdit" color="negative" flat icon="delete" label="Eliminar Registro" @click="deleteConsumption" :loading="saving" />
        </div>
      </div>

      <!-- METADATA -->
      <div class="row q-col-gutter-md q-mb-md">
        <div class="col-12 col-md-6">
          <q-card bordered flat>
            <q-card-section>
              <div class="text-caption text-grey">Comedor Local</div>
              <div class="text-body1 text-weight-bold text-orange-8"><q-icon name="restaurant" class="q-mr-sm"/>{{ transfer.source?.name }}</div>
            </q-card-section>
          </q-card>
        </div>
        <div class="col-12 col-md-6">
          <q-card bordered flat>
            <q-card-section>
              <div class="text-caption text-grey">Fecha del Registro</div>
              <div class="text-body1 text-weight-bold">{{ new Date(transfer.createdAt).toLocaleString() }}</div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- BUSCADOR (SOLO EN MODO EDICIÓN) -->
      <q-card bordered flat class="q-mb-md" v-if="isEditing">
        <q-card-section class="bg-orange-1 text-orange-10 row items-center">
          <q-icon name="info" size="sm" class="q-mr-sm" /> Estás editando este registro. Recuerda guardar los cambios.
        </q-card-section>
        <q-card-section>
          <q-input v-model="searchQuery" outlined dense placeholder="Buscar producto en tu cocina para agregar..." clearable>
            <template v-slot:append><q-icon name="search" /></template>
          </q-input>
          <q-list bordered separator v-if="filteredProducts.length > 0" class="q-mt-sm">
            <q-item v-for="product in filteredProducts" :key="product.id" clickable @click="addItem(product)">
              <q-item-section>
                <q-item-label>{{ product.name }}</q-item-label>
                <q-item-label caption>Cód: {{ product.code }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-badge color="green">
                  Stock Local: {{ product.availableStock }} {{ product.unit?.abbreviation }}
                </q-badge>
              </q-item-section>
            </q-item>
          </q-list>
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
          <!-- Modo Edición: Cantidad -->
          <template v-slot:body-cell-quantity="props">
            <q-td :props="props">
              <template v-if="isEditing">
                <q-input 
                  v-model.number="props.row.quantity" 
                  type="number" 
                  dense outlined 
                  style="max-width: 120px; margin: 0 auto;"
                  :error="props.row.quantity > props.row.availableStock"
                  :error-message="`Max local: ${props.row.availableStock}`"
                  bottom-slots
                />
              </template>
              <template v-else>
                {{ props.row.quantity }}
              </template>
            </q-td>
          </template>

          <!-- Modo Edición: Acciones -->
          <template v-slot:body-cell-actions="props">
            <q-td :props="props" v-if="isEditing">
              <q-btn flat round dense color="negative" icon="delete" @click="removeItem(transferItems.indexOf(props.row))" />
            </q-td>
          </template>
          
          <!-- MODO MÓVIL (GRID): Tarjeta Detalles Consumo -->
          <template v-slot:item="props">
            <div class="q-pa-xs col-12 col-sm-6">
              <q-card bordered flat class="bg-white">
                <q-card-section class="q-pb-none row items-start justify-between">
                  <div class="text-weight-bold" style="max-width: 80%; line-height: 1.1;">{{ props.row.productName }}</div>
                  <q-btn v-if="isEditing" flat round dense color="negative" icon="delete" size="sm" @click="removeItem(transferItems.indexOf(props.row))" />
                </q-card-section>
                
                <q-card-section class="q-pt-sm row items-center justify-between">
                  <div class="text-caption text-grey-8">Stock Local: {{ props.row.availableStock }}</div>
                  <div v-if="isEditing" style="min-width: 120px">
                    <q-input 
                      v-model.number="props.row.quantity" 
                      type="number" 
                      dense outlined 
                      :error="props.row.quantity > props.row.availableStock"
                      :error-message="`Max: ${props.row.availableStock}`"
                      bottom-slots
                    />
                  </div>
                  <div v-else class="text-weight-bold text-subtitle1">
                    {{ props.row.quantity }} {{ props.row.unit }}
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </template>
        </q-table>
        
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
import { useConsumptionDetails } from '~/composables/features/useConsumptionDetails'
import { useRouter } from 'vue-router'

const router = useRouter()
const {
  transfer, loading, saving, isEditing, searchQuery, transferItems, filteredProducts,
  canEdit, columns,
  deleteConsumption, enableEdit, cancelEdit, addItem, removeItem, saveChanges, approveConsumption,
  getStatusColor, getStatusLabel 
} = useConsumptionDetails()

const openReport = (id: number) => {
  const url = router.resolve(`/kitchen/consumptions/report-${id}`).href
  window.open(url, '_blank')
}
</script>
