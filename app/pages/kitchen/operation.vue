<template>
  <q-page padding>
    <div v-if="loading" class="row justify-center q-pa-xl">
      <q-spinner color="primary" size="3em" />
    </div>

    <div v-else-if="!hasAssignedWarehouse && !isGlobalUser" class="row justify-center q-pa-xl">
      <q-banner class="bg-negative text-white rounded-borders" style="max-width: 600px">
        <template v-slot:avatar>
          <q-icon name="warning" />
        </template>
        <div class="text-h6">Acceso Denegado</div>
        <div>No tienes un comedor/almacén local asignado a tu perfil de usuario. Por favor contacta al administrador para que configure tu cuenta.</div>
      </q-banner>
    </div>

    <div v-else>
      <div class="row items-center justify-between q-mb-lg">
        <div class="text-h4 text-weight-bold text-primary">
          <q-icon name="restaurant_menu" class="q-mr-sm" /> Mi Operación: {{ assignedWarehouseName }}
        </div>
        <div v-if="isGlobalUser" style="min-width: 300px;">
          <q-select
            v-model="activeWarehouseId"
            :options="warehouses"
            option-value="id"
            option-label="name"
            label="Supervisar Comedor (Modo Dios)"
            outlined
            dense
            emit-value
            map-options
            bg-color="amber-1"
            label-color="amber-9"
          >
            <template v-slot:prepend>
              <q-icon name="admin_panel_settings" color="amber-9" />
            </template>
          </q-select>
        </div>
      </div>

      <div v-if="isGlobalUser && !hasAssignedWarehouse" class="row justify-center q-pa-xl text-center">
        <div class="text-h5 text-grey-6">
          <q-icon name="touch_app" size="64px" color="grey-4" class="q-mb-md block" style="margin: 0 auto" />
          Selecciona un comedor en la parte superior para visualizar y operar.
        </div>
      </div>

      <div v-else>

      <!-- SECCIÓN 1: RECEPCIONES PENDIENTES (CAMIONES EN PUERTA) -->
      <q-card bordered flat class="q-mb-lg" v-if="incomingTransfers.length > 0">
        <q-card-section class="bg-orange-1 text-orange-9 row items-center">
          <q-icon name="local_shipping" size="sm" class="q-mr-sm" />
          <div class="text-h6">Recepciones Pendientes (Camiones en Puerta)</div>
        </q-card-section>
        <q-list bordered separator>
          <q-item v-for="tx in incomingTransfers" :key="tx.id" class="q-py-md">
            <q-item-section avatar>
              <q-avatar color="orange-2" text-color="orange-9" icon="inventory" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-weight-bold">Transferencia #{{ tx.id }}</q-item-label>
              <q-item-label caption>Desde: {{ tx.source?.name || 'Central' }}</q-item-label>
              <q-item-label caption>Aprobado el: {{ new Date(tx.updatedAt).toLocaleString() }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-btn color="green-8" icon="done_all" label="Recibir Mercancía" @click="confirmReception(tx.id)" :loading="saving" />
            </q-item-section>
          </q-item>
        </q-list>
      </q-card>

      <!-- SECCIÓN 2: CONTROL DE TURNO -->
      <q-card bordered flat class="q-mb-lg text-center q-pa-xl" v-if="!activeShift">
        <q-icon name="lock_clock" size="64px" color="grey-4" />
        <div class="text-h5 text-grey-8 q-mt-md">Tu turno está cerrado</div>
        <div class="text-subtitle1 text-grey-6 q-mb-lg">Para poder registrar despachos o consumos, necesitas abrir el turno de trabajo.</div>
        <q-btn color="primary" size="lg" icon="play_circle" label="Abrir Turno de Trabajo" @click="openShiftDialog" :loading="saving" />
      </q-card>

      <template v-else>
        <!-- SECCIÓN 3: PANEL DE DESPACHO (TURNO ABIERTO) -->
        <q-card bordered flat class="q-mb-md">
          <q-card-section class="bg-blue-grey-1 row items-center justify-between">
            <div>
              <q-icon name="schedule" size="sm" color="primary" class="q-mr-sm" />
              <span class="text-h6 text-primary">Turno Activo</span>
              <q-badge color="primary" class="q-ml-sm">Inició: {{ new Date(activeShift.startTime).toLocaleTimeString() }}</q-badge>
            </div>
            <q-btn color="negative" outline icon="stop_circle" label="Cerrar Turno" @click="openCloseShiftDialog" :loading="saving" />
          </q-card-section>
          
          <q-card-section class="row q-gutter-sm justify-center q-py-lg">
            <q-btn color="blue-8" size="lg" icon="restaurant" label="Registrar Consumo Diario" @click="openConsumptionDialog('CONSUMPTION')" />
            <q-btn color="red-8" size="lg" outline icon="delete_sweep" label="Registrar Merma" @click="openConsumptionDialog('LOSS')" />
            <q-btn color="purple-8" size="lg" outline icon="volunteer_activism" label="Apoyo Institucional" @click="openConsumptionDialog('SUPPORT')" />
          </q-card-section>
        </q-card>

        <!-- SECCIÓN 4: HISTORIAL DE CONSUMOS DEL TURNO (CRUD) -->
        <q-card bordered flat class="q-mb-lg">
          <q-card-section class="bg-grey-2">
            <div class="text-h6 text-grey-8 row items-center">
              <q-icon name="list_alt" class="q-mr-sm" /> Historial de Registros de Hoy
            </div>
            <div class="text-caption text-grey-6">
              Todos los consumos o mermas que registres hoy aparecerán aquí hasta que el Gerente los apruebe. Puedes eliminarlos si cometiste un error.
            </div>
          </q-card-section>
          
          <q-table :grid="$q.screen.lt.md"
            v-if="shiftConsumptions.length > 0"
            :rows="shiftConsumptions"
            :columns="consumptionColumns"
            row-key="id"
            flat bordered
          >
            <!-- COLUMNA TIPO -->
            <template v-slot:body-cell-type="props">
              <q-td :props="props">
                <q-chip :color="props.row.type === 'CONSUMPTION' ? 'blue-1' : (props.row.type === 'SUPPORT' ? 'purple-1' : 'red-1')" 
                        :text-color="props.row.type === 'CONSUMPTION' ? 'blue-8' : (props.row.type === 'SUPPORT' ? 'purple-8' : 'red-8')" size="sm">
                  <q-icon :name="props.row.type === 'CONSUMPTION' ? 'restaurant' : (props.row.type === 'SUPPORT' ? 'volunteer_activism' : 'delete_sweep')" class="q-mr-xs" />
                  {{ props.row.type === 'CONSUMPTION' ? 'Consumo' : (props.row.type === 'SUPPORT' ? 'Apoyo' : 'Merma') }}
                </q-chip>
              </q-td>
            </template>
            
            <!-- COLUMNA ESTADO -->
            <template v-slot:body-cell-status="props">
              <q-td :props="props">
                <q-badge :color="props.row.status === 'PENDING' ? 'orange' : (props.row.status === 'CONFIRMED' ? 'green' : 'grey')">
                  {{ props.row.status === 'PENDING' ? 'Pendiente' : (props.row.status === 'CONFIRMED' ? 'Aprobado' : props.row.status) }}
                </q-badge>
              </q-td>
            </template>

            <!-- COLUMNA ACCIONES -->
            <template v-slot:body-cell-actions="props">
              <q-td :props="props">
                <!-- BOTÓN VER/EDITAR "ADENTRO" -->
                <q-btn flat round color="primary" icon="visibility" :to="`/kitchen/consumptions/${props.row.id}`" size="sm">
                  <q-tooltip>Ver / Modificar Detalles</q-tooltip>
                </q-btn>
                
              <!-- BOTÓN ELIMINAR "DESDE AFUERA" -->
              <q-btn flat round color="negative" icon="delete" @click="deleteConsumption(props.row.id)" v-if="props.row.status === 'PENDING'" size="sm">
                <q-tooltip>Eliminar Registro</q-tooltip>
              </q-btn>
            </q-td>
          </template>

          <!-- MODO GRID -->
          <template v-slot:item="props">
            <div class="q-pa-xs col-12 col-sm-6 col-md-4">
              <q-card bordered flat>
                <q-card-section class="q-pb-none">
                  <div v-for="col in props.cols.filter(c => c.name !== 'actions')" :key="col.name" class="row justify-between q-mb-sm">
                    <div class="text-caption text-grey-7">{{ col.label }}</div>
                    <div class="text-weight-bold text-right">
                      <template v-if="col.name === 'type'">
                        <q-chip :color="props.row.type === 'CONSUMPTION' ? 'blue-1' : (props.row.type === 'SUPPORT' ? 'purple-1' : 'red-1')" 
                                :text-color="props.row.type === 'CONSUMPTION' ? 'blue-8' : (props.row.type === 'SUPPORT' ? 'purple-8' : 'red-8')" size="sm">
                          {{ props.row.type === 'CONSUMPTION' ? 'Consumo' : (props.row.type === 'SUPPORT' ? 'Apoyo' : 'Merma') }}
                        </q-chip>
                      </template>
                      <template v-else-if="col.name === 'status'">
                        <q-badge :color="props.row.status === 'PENDING' ? 'orange' : (props.row.status === 'CONFIRMED' ? 'green' : 'grey')">
                          {{ props.row.status === 'PENDING' ? 'Pendiente' : (props.row.status === 'CONFIRMED' ? 'Aprobado' : props.row.status) }}
                        </q-badge>
                      </template>
                      <template v-else>{{ col.value }}</template>
                    </div>
                  </div>
                </q-card-section>
                <q-separator />
                <q-card-actions align="right">
                  <q-btn flat color="primary" label="Ver" icon="visibility" :to="`/kitchen/consumptions/${props.row.id}`" />
                  <q-btn flat color="negative" icon="delete" @click="deleteConsumption(props.row.id)" v-if="props.row.status === 'PENDING'" />
                </q-card-actions>
              </q-card>
            </div>
          </template>
        </q-table>
          
          <q-card-section v-else class="text-center text-grey-5 q-pa-xl">
            <q-icon name="receipt_long" size="48px" class="q-mb-sm block q-mx-auto" />
            Aún no has registrado ningún consumo o merma en este turno.
          </q-card-section>
        </q-card>
      </template>

      <!-- DIALOGO DE REGISTRO DE CONSUMO/MERMA/APOYO -->
      <q-dialog v-model="isConsumptionDialogVisible" maximized transition-show="slide-up" transition-hide="slide-down">
        <q-card>
          <q-toolbar :class="consumptionType === 'CONSUMPTION' ? 'bg-blue-8 text-white' : (consumptionType === 'SUPPORT' ? 'bg-purple-8 text-white' : 'bg-red-8 text-white')">
            <q-btn flat round dense icon="close" v-close-popup />
            <q-toolbar-title>{{ consumptionType === 'CONSUMPTION' ? 'Registrar Consumo / Despacho' : (consumptionType === 'SUPPORT' ? 'Registrar Apoyo Institucional' : 'Registrar Merma / Pérdida') }}</q-toolbar-title>
            <q-space />
            <q-btn flat icon="send" label="Enviar a Aprobación" @click="submitConsumption" :loading="saving" />
          </q-toolbar>

          <q-card-section class="q-pa-md">
            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-4">
                <q-card flat bordered class="q-pa-sm q-mb-md" v-if="consumptionType === 'SUPPORT'">
                  <div class="text-subtitle2 text-purple-9 q-mb-sm">
                    <q-icon name="account_balance" class="q-mr-xs" /> Seleccione la Institución Receptora:
                  </div>
                  <q-select
                    v-model="selectedInstitutionId"
                    :options="institutions"
                    option-value="id"
                    option-label="name"
                    label="Institución *"
                    outlined
                    dense
                    emit-value
                    map-options
                    :rules="[val => !!val || 'Debe seleccionar una institución']"
                  />
                </q-card>

                <q-card flat bordered class="q-pa-sm">
                  <q-input v-model="searchQuery" outlined dense placeholder="Buscar producto en almacén local..." clearable autofocus>
                    <template v-slot:append><q-icon name="search" /></template>
                  </q-input>
                  <q-list bordered separator v-if="filteredProducts.length > 0" class="q-mt-sm">
                    <q-item v-for="product in filteredProducts" :key="product.id" clickable @click="addConsumptionItem(product)">
                      <q-item-section>
                        <q-item-label class="text-weight-bold">{{ product.name }}</q-item-label>
                        <q-item-label caption>Cód: {{ product.code }} | Disp: <span class="text-positive text-weight-bold">{{ product.localStock }} {{ product.unit?.abbreviation }}</span></q-item-label>
                      </q-item-section>
                      <q-item-section side>
                        <q-btn flat round dense color="primary" icon="add_circle" />
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-card>
              </div>

              <div class="col-12 col-md-8">
                <q-card flat bordered>
                  <q-table :grid="$q.screen.lt.md"
                    :rows="consumptionItems"
                    :columns="[
                      { name: 'product', label: 'Producto', field: 'productName', align: 'left' },
                      { name: 'stock', label: 'Stock Local Actual', field: 'availableStock', align: 'center' },
                      { name: 'quantity', label: 'Cantidad a Despachar', field: 'quantity', align: 'center' },
                      { name: 'actions', label: '', field: 'actions', align: 'right' }
                    ]"
                    row-key="productId"
                    flat hide-pagination :pagination="{ rowsPerPage: 0 }"
                  >
                    <template v-slot:body-cell-quantity="props">
                      <q-td :props="props">
                        <q-input 
                          v-model.number="props.row.quantity" 
                          type="number" dense outlined 
                          style="max-width: 120px; margin: 0 auto;"
                          :error="props.row.quantity > props.row.availableStock"
                          :error-message="`Max: ${props.row.availableStock}`"
                          bottom-slots
                        />
                      </q-td>
                    </template>
                    <template v-slot:body-cell-actions="props">
                      <q-td :props="props">
                        <q-btn flat round dense color="negative" icon="delete" @click="removeConsumptionItem(consumptionItems.indexOf(props.row))" />
                      </q-td>
                    </template>
                  </q-table>
                </q-card>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </q-dialog>

      <!-- DIALOGO DE APERTURA DE TURNO -->
      <q-dialog v-model="isShiftDialogOpen">
        <q-card style="min-width: 350px">
          <q-card-section class="bg-primary text-white">
            <div class="text-h6">Abrir Turno de Trabajo</div>
          </q-card-section>
          <q-card-section class="q-pt-md">
            <div class="q-mb-md">
              <div class="text-subtitle2 q-mb-sm text-grey-8">Tipo de Turno</div>
              <q-option-group
                v-model="shiftForm.shiftType"
                :options="[
                  { label: 'Turno Diurno', value: 'DIURNO' },
                  { label: 'Turno Nocturno', value: 'NOCTURNO' }
                ]"
                color="primary"
                inline
              />
            </div>
            <q-separator class="q-my-md" />
            <div class="q-mb-sm">
              <q-toggle v-model="shiftForm.useCustomTime" label="Establecer fecha/hora manualmente (Retroactivo)" color="orange" />
            </div>
            <div v-if="shiftForm.useCustomTime">
              <q-input v-model="shiftForm.customStartTime" type="datetime-local" outlined dense label="Fecha y Hora de Inicio" hint="Cuándo empezó realmente el turno" />
            </div>
          </q-card-section>
          <q-card-actions align="right" class="text-primary">
            <q-btn flat label="Cancelar" v-close-popup />
            <q-btn color="primary" label="Abrir Turno" @click="submitOpenShift" :loading="saving" />
          </q-card-actions>
        </q-card>
      </q-dialog>

      <!-- DIALOGO DE CIERRE DE TURNO -->
      <q-dialog v-model="isCloseShiftDialogOpen">
        <q-card style="min-width: 350px">
          <q-card-section class="bg-negative text-white">
            <div class="text-h6">Cerrar Turno</div>
          </q-card-section>
          <q-card-section class="q-pt-md">
            <div class="text-body2 q-mb-md text-grey-8">
              ¿Estás seguro de finalizar el turno? Ya no podrás registrar consumos hasta abrir uno nuevo.
            </div>
            <div class="q-mb-sm">
              <q-toggle v-model="closeShiftForm.useCustomTime" label="Establecer fecha/hora manualmente (Retroactivo)" color="orange" />
            </div>
            <div v-if="closeShiftForm.useCustomTime">
              <q-input v-model="closeShiftForm.customEndTime" type="datetime-local" outlined dense label="Fecha y Hora de Cierre" hint="Cuándo finalizó realmente el turno" />
            </div>
          </q-card-section>
          <q-card-actions align="right" class="text-primary">
            <q-btn flat label="Cancelar" v-close-popup />
            <q-btn color="negative" label="Cerrar Turno" @click="submitCloseShift" :loading="saving" />
          </q-card-actions>
        </q-card>
      </q-dialog>

      </div>

    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useKitchenOperation } from '~/composables/features/useKitchenOperation'

const {
  loading, saving, hasAssignedWarehouse, assignedWarehouseName,
  incomingTransfers, confirmReception,
  activeShift, openShiftDialog, submitOpenShift,
  openCloseShiftDialog, submitCloseShift,
  isShiftDialogOpen, isCloseShiftDialogOpen, shiftForm, closeShiftForm,
  shiftConsumptions, deleteConsumption, consumptionColumns,
  isConsumptionDialogVisible, consumptionType, consumptionItems, searchQuery, filteredProducts,
  selectedInstitutionId, institutions,
  openConsumptionDialog, addConsumptionItem, removeConsumptionItem, submitConsumption,
  isGlobalUser, activeWarehouseId, warehouses
} = useKitchenOperation()
</script>

