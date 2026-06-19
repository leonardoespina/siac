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
          
          <template v-if="transfer.status === 'APPROVED'">
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

      <!-- BUSCADOR (SOLO EN MODO EDICIÓN) -->
      <q-card bordered flat class="q-mb-md" v-if="isEditing">
        <q-card-section class="bg-orange-1 text-orange-10 row items-center">
          <q-icon name="info" size="sm" class="q-mr-sm" /> Estás editando esta transferencia. Recuerda guardar los cambios.
        </q-card-section>
        <q-card-section>
          <q-input v-model="searchQuery" outlined dense placeholder="Buscar producto para agregar..." clearable>
            <template v-slot:append><q-icon name="search" /></template>
          </q-input>
          <q-list bordered separator v-if="filteredProducts.length > 0" class="q-mt-sm">
            <q-item v-for="product in filteredProducts" :key="product.id" clickable @click="addItem(product)">
              <q-item-section>
                <q-item-label>{{ product.name }}</q-item-label>
                <q-item-label caption>Cód: {{ product.code }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-badge :color="getCentralStock(product.id) > 0 ? 'green' : 'red'">
                  Stock: {{ getCentralStock(product.id) }} {{ product.unit?.abbreviation }}
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
                  :error-message="`Max: ${props.row.availableStock}`"
                  bottom-slots
                />
              </template>
              <template v-else>
                {{ props.row.quantity }}
              </template>
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

          <template v-slot:body-cell-actions="props">
            <q-td :props="props" v-if="isEditing">
              <q-btn flat round dense color="negative" icon="delete" @click="removeItem(transferItems.indexOf(props.row))" />
            </q-td>
          </template>

          <!-- MODO GRID MÓVIL PERSONALIZADO -->
          <template v-slot:item="props">
            <div class="q-pa-xs col-12 col-sm-6 col-md-4">
              <q-card bordered flat>
                <q-card-section class="q-pb-none">
                  <div v-for="col in props.cols.filter(c => c.name !== 'actions')" :key="col.name" class="row justify-between q-mb-sm items-center">
                    <div class="text-caption text-grey-7">{{ col.label }}</div>
                    <div class="text-weight-bold text-right" style="max-width: 60%">
                      <template v-if="col.name === 'quantity'">
                        <template v-if="!isEditing">{{ props.row.quantity }}</template>
                        <q-input v-else v-model.number="props.row.quantity" type="number" dense outlined style="max-width: 90px; margin: 0 0 0 auto" :error="props.row.quantity > props.row.availableStock" :error-message="`Max: ${props.row.availableStock}`" bottom-slots />
                      </template>
                      <template v-else-if="col.name === 'price'">
                        <template v-if="!isEditing">${{ props.row.unitPrice }}</template>
                        <q-input v-else v-model.number="props.row.unitPrice" type="number" dense outlined prefix="$" style="max-width: 110px; margin: 0 0 0 auto" />
                      </template>
                      <template v-else>
                        {{ col.value }}
                      </template>
                    </div>
                  </div>
                </q-card-section>
                <q-separator v-if="isEditing" />
                <q-card-actions align="right" v-if="isEditing">
                  <q-btn flat color="negative" icon="delete" @click="removeItem(transferItems.indexOf(props.row))" label="Eliminar" />
                </q-card-actions>
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
import { useTransferDetails } from '~/composables/features/useTransferDetails'

const {
  transfer, loading, saving, showPrices, isEditing, searchQuery, transferItems, filteredProducts,
  canApprove, canEdit, columns, getCentralStock,
  updateStatus, promptReject, deleteDraft, enableEdit, cancelEdit, addItem, removeItem, saveChanges,
  getStatusColor, getStatusLabel 
} = useTransferDetails()
</script>
