<template>
  <q-page padding>
    <div class="row items-center justify-between q-mb-md">
      <div class="text-h4 text-weight-bold text-primary">
        <q-icon name="history" class="q-mr-sm" /> Historial de Turnos y Consumos
      </div>
    </div>

    <!-- Filtros -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section class="row q-col-gutter-md items-center">
        <div class="col-12 col-md-3">
          <q-input v-model="filterDate" type="date" outlined dense label="Fecha del Turno" />
        </div>
        <div class="col-12 col-md-4">
          <q-select 
            v-model="filterWarehouse" 
            :options="[{id: null, name: 'Todos los Comedores'}, ...warehousesStore.localWarehouses]" 
            option-value="id" option-label="name" emit-value map-options
            outlined dense label="Filtrar por Comedor" 
          />
        </div>
        <div class="col-12 col-md-5 row justify-end">
          <q-btn flat icon="refresh" label="Actualizar" @click="fetchShifts" color="primary" />
        </div>
      </q-card-section>
    </q-card>

    <!-- Indicadores -->
    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12 col-md-3">
        <q-card class="bg-blue-8 text-white">
          <q-card-section>
            <div class="text-h4 text-weight-bold">{{ stats.openShifts }}</div>
            <div class="text-subtitle2">Turnos Abiertos</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-md-3">
        <q-card class="bg-grey-8 text-white">
          <q-card-section>
            <div class="text-h4 text-weight-bold">{{ stats.closedShifts }}</div>
            <div class="text-subtitle2">Turnos Cerrados</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-md-3">
        <q-card class="bg-green-8 text-white">
          <q-card-section>
            <div class="text-h4 text-weight-bold">{{ stats.totalConsumptions }}</div>
            <div class="text-subtitle2">Líneas de Consumo Despachadas</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-md-3">
        <q-card class="bg-red-8 text-white">
          <q-card-section>
            <div class="text-h4 text-weight-bold">{{ stats.totalLosses }}</div>
            <div class="text-subtitle2">Líneas de Merma Reportadas</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Lista de Turnos -->
    <div v-if="loading" class="row justify-center q-pa-xl">
      <q-spinner color="primary" size="3em" />
    </div>

    <div v-else-if="shifts.length === 0" class="row justify-center q-pa-xl text-grey text-h6">
      No hay turnos registrados para estos filtros.
    </div>

    <div v-else>
      <q-card bordered flat>
        <q-table :grid="$q.screen.lt.md"
          :rows="shifts"
          :columns="columns"
          row-key="id"
          flat
          v-model:pagination="pagination"
        >
          <!-- Celdas Personalizadas -->
          <template v-slot:body="props">
            <q-tr :props="props" :class="props.row.status === 'OPEN' ? 'bg-blue-1' : ''">
              <q-td auto-width>
                <q-btn size="sm" color="primary" round dense @click="props.expand = !props.expand" :icon="props.expand ? 'remove' : 'add'" />
              </q-td>
              <q-td key="warehouse" :props="props">{{ props.row.warehouse?.name }}</q-td>
              <q-td key="operator" :props="props">{{ props.row.user?.name }}</q-td>
              <q-td key="startTime" :props="props">{{ new Date(props.row.startTime).toLocaleTimeString() }}</q-td>
              <q-td key="endTime" :props="props">{{ props.row.endTime ? new Date(props.row.endTime).toLocaleTimeString() : '-' }}</q-td>
              <q-td key="status" :props="props">
                <q-badge :color="props.row.status === 'OPEN' ? 'primary' : 'grey'">
                  {{ props.row.status === 'OPEN' ? 'EN CURSO' : 'CERRADO' }}
                </q-badge>
              </q-td>
            </q-tr>
            
            <!-- Fila Expandida: Detalles del Turno -->
            <q-tr v-show="props.expand" :props="props">
              <q-td colspan="100%">
                <div class="text-left q-pa-md bg-grey-1">
                  <div v-if="props.row.transactions && props.row.transactions.length > 0">
                    <div class="text-subtitle2 q-mb-sm text-grey-8">Movimientos Registrados:</div>
                    <q-list bordered separator class="bg-white">
                      <q-item v-for="tx in props.row.transactions" :key="tx.id">
                        <q-item-section avatar>
                          <q-avatar :color="tx.type === 'CONSUMPTION' ? 'blue-2' : (tx.type === 'SUPPORT' ? 'purple-2' : 'red-2')" 
                                    :text-color="tx.type === 'CONSUMPTION' ? 'blue-9' : (tx.type === 'SUPPORT' ? 'purple-9' : 'red-9')" 
                                    :icon="tx.type === 'CONSUMPTION' ? 'restaurant' : (tx.type === 'SUPPORT' ? 'volunteer_activism' : 'delete')" />
                        </q-item-section>
                        <q-item-section>
                          <q-item-label class="text-weight-bold">{{ tx.type === 'CONSUMPTION' ? 'Consumo Diario' : (tx.type === 'SUPPORT' ? 'Apoyo Institucional' : 'Merma Reportada') }} (Registro #{{ tx.id }})</q-item-label>
                          <q-item-label v-if="tx.type === 'SUPPORT'" class="text-purple-8 caption q-mb-xs">
                            <q-icon name="account_balance" size="xs" /> {{ tx.institution?.name || 'Institución Desconocida' }}
                          </q-item-label>
                          <q-item-label caption v-for="det in tx.details" :key="det.id">
                            • {{ det.quantity }} {{ det.product?.unit?.abbreviation }} - {{ det.product?.name }}
                          </q-item-label>
                        </q-item-section>
                        <q-item-section side>
                          <q-badge :color="tx.status === 'PENDING' ? 'orange' : (tx.status === 'CONFIRMED' ? 'green' : 'grey')">
                            {{ tx.status === 'PENDING' ? 'Pendiente' : (tx.status === 'CONFIRMED' ? 'Aprobado' : tx.status) }}
                          </q-badge>
                        </q-item-section>
                      </q-item>
                    </q-list>
                  </div>
                  <div v-else class="text-grey text-italic">
                    No se registraron consumos ni mermas en este turno.
                  </div>
                </div>
              </q-td>
            </q-tr>
          </template>
        </q-table>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useShiftsReport } from '~/composables/features/useShiftsReport'

const {
  loading, shifts, filterDate, filterWarehouse, warehousesStore, stats, fetchShifts, columns, pagination
} = useShiftsReport()
</script>

