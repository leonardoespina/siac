<template>
  <q-page padding>
    <div v-if="loading" class="row justify-center q-pa-xl">
      <q-spinner color="primary" size="3em" />
    </div>

    <div v-else-if="transaction">
      <!-- HEADER -->
      <div class="row items-center justify-between q-mb-md">
        <div class="row items-center">
          <q-btn flat round icon="arrow_back" color="primary" to="/inventory/receptions" class="q-mr-sm" />
          <div class="text-h4 text-weight-bold text-primary">Recepción #{{ transaction.id }}</div>
          <q-chip :color="getStatusColor(transaction.status)" text-color="white" class="q-ml-md">
            {{ getStatusLabel(transaction.status) }}
          </q-chip>
        </div>
        
        <!-- BOTONES DE ACCIÓN (MÁQUINA DE ESTADO) -->
        <div class="q-gutter-sm">
          <template v-if="transaction.status === 'DRAFT'">
            <template v-if="!isEditing">
              <q-btn color="negative" flat icon="delete" label="Eliminar Borrador" @click="deleteDraft" :loading="saving" />
              <q-btn color="grey-8" outline icon="edit" label="Habilitar Edición" @click="isEditing = true" />
              <q-btn color="orange-8" icon="send" label="Enviar a Aprobación" @click="updateStatus('PENDING')" :loading="saving" />
            </template>
            <template v-else>
              <q-btn color="grey-6" flat label="Cancelar" @click="isEditing = false; updateStatus('DRAFT')" :disable="saving" /> <!-- Truco para recargar -->
              <q-btn color="positive" icon="save" label="Guardar Cambios" @click="saveDraftChanges" :loading="saving" />
            </template>
          </template>

          <template v-if="transaction.status === 'PENDING' && canApprove">
            <q-btn 
              color="negative" icon="close" label="Rechazar" outline
              @click="promptReject" 
              :loading="saving"
            />
            <q-btn 
              color="blue-8" icon="check" label="Aprobar" 
              @click="updateStatus('APPROVED')" 
              :loading="saving"
            />
          </template>
          <q-btn 
            v-if="transaction.status === 'APPROVED'"
            color="green-8" icon="done_all" label="Confirmar Ingreso" 
            @click="updateStatus('CONFIRMED')" 
            :loading="saving"
          />
        </div>
      </div>

      <!-- METADATA -->
      <div class="row q-col-gutter-md q-mb-md">
        <div class="col-12 col-md-4">
          <q-card bordered flat>
            <q-card-section>
              <div class="text-caption text-grey">Proveedor</div>
              <div class="text-body1 text-weight-bold">{{ transaction.supplier?.name || 'No especificado' }}</div>
            </q-card-section>
          </q-card>
        </div>
        <div class="col-12 col-md-4">
          <q-card bordered flat>
            <q-card-section>
              <div class="text-caption text-grey">Almacén Destino</div>
              <div class="text-body1 text-weight-bold">{{ transaction.destination?.name || 'No especificado' }}</div>
            </q-card-section>
          </q-card>
        </div>
        <div class="col-12 col-md-4">
          <q-card bordered flat>
            <q-card-section>
              <div class="text-caption text-grey">Fecha</div>
              <div class="text-body1 text-weight-bold">{{ new Date(transaction.createdAt).toLocaleString() }}</div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- DETALLES (PRODUCTOS) -->
      <q-card bordered flat>
        <q-card-section class="bg-grey-2 row justify-between items-center">
          <div class="text-h6">Detalle de Productos</div>
          <div class="text-subtitle1 text-weight-bold" v-if="transaction.status === 'DRAFT' || grandTotal > 0">
            Gran Total: <span class="text-primary">${{ grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</span>
          </div>
        </q-card-section>
        
        <q-table
          :rows="transaction.details"
          :columns="columns"
          row-key="id"
          flat
          hide-pagination
          :pagination="{ rowsPerPage: 0 }"
        >
          <template v-slot:body-cell-quantity="props">
            <q-td :props="props" class="text-weight-bold">
              <template v-if="!isEditing">{{ props.row.quantity }}</template>
              <q-input v-else v-model.number="props.row.quantity" type="number" dense outlined style="max-width: 90px; margin: 0 auto" />
            </q-td>
          </template>

          <template v-slot:body-cell-price="props">
            <q-td :props="props">
              <template v-if="!isEditing">${{ props.row.unitPrice }}</template>
              <q-input v-else v-model.number="props.row.unitPrice" type="number" dense outlined prefix="$" style="max-width: 110px; margin: 0 auto" />
            </q-td>
          </template>

          <template v-slot:body-cell-actions="props">
            <q-td :props="props">
              <q-btn flat round dense color="negative" icon="delete" @click="removeRow(props.rowIndex)">
                <q-tooltip>Eliminar de la lista</q-tooltip>
              </q-btn>
            </q-td>
          </template>
        </q-table>
      </q-card>
      
      <!-- HISTORIAL / NOTAS -->
      <q-card bordered flat class="q-mt-md" v-if="transaction.notes">
        <q-card-section class="bg-grey-2">
          <div class="text-subtitle1 text-weight-bold">Notas y Observaciones</div>
        </q-card-section>
        <q-card-section style="white-space: pre-wrap;">{{ transaction.notes }}</q-card-section>
      </q-card>

    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useReceptionDetails } from '~/composables/features/useReceptionDetails'

// ── LÓGICA DELEGADA AL COMPOSABLE ───────────────────────────────────────────
const {
  transaction,
  loading,
  saving,
  canApprove,
  isEditing,
  grandTotal,
  columns,
  updateStatus,
  promptReject,
  deleteDraft,
  removeRow,
  saveDraftChanges,
  getStatusColor,
  getStatusLabel
} = useReceptionDetails()
</script>
