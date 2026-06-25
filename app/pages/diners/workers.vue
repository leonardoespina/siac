<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useSquadsStore } from '~/stores/squads'
import { useDinersStore } from '~/stores/diners'
import { useDependenciesStore } from '~/stores/dependencies'
import { usePositionsStore } from '~/stores/positions'
import { useWarehousesStore } from '~/stores/warehouses'
import { useAuthStore } from '~/stores/auth'
import { useQuasar } from 'quasar'
import { useWorkerForm } from '~/composables/features/useWorkerForm'
import { useExcelDinerImport } from '~/composables/features/useExcelDinerImport'
import SharedDinerExcelUploader from '~/components/SharedDinerExcelUploader.vue'
import SharedSmartFilter from '~/components/SharedSmartFilter.vue'
import BiometricRegistrationModal from '~/components/comensales/BiometricRegistrationModal.vue'

const $q = useQuasar()
const squadsStore = useSquadsStore()
const dinersStore = useDinersStore()
const depStore = useDependenciesStore()
const positionsStore = usePositionsStore()
const warehousesStore = useWarehousesStore()
const authStore = useAuthStore()

const { showDialog, isEdit, formData, openDialog, openEditDialog, submit } = useWorkerForm()
const { isModalOpen, isProcessing, isValidationScreen, validRows, invalidRows, uploadProgress, parseExcel, confirmImport, cancelValidation, downloadTemplate } = useExcelDinerImport()

const openExcelModal = () => {
  isModalOpen.value = true
}

// Modal Biométrico
const isBiometricModalOpen = ref(false)
const biometricDinerId = ref<number | null>(null)
const biometricDinerName = ref('')

const openBiometricModal = (row: any) => {
  biometricDinerId.value = row.id
  biometricDinerName.value = row.name
  isBiometricModalOpen.value = true
}

// Filtros para Admin Global y Búsqueda
const filterDependencyId = ref<number | null>(null)
const filterSubdependencyId = ref<number | null>(null)

// Estado del Smart Filter
const filterState = ref({
  search: '',
  warehouseId: null,
  positionId: null,
  rationType: null
})

// Opciones de Ración
const rationOptions = [
  { label: 'Normal (Plato Estándar)', value: 'NORMAL' },
  { label: 'Dieta Médica', value: 'DIETA' }
]

// Extraemos las cuadrillas globales para el Select
const squadOptions = computed(() => {
  return squadsStore.squads.map(squad => ({
    label: squad.name,
    value: squad.id
  }))
})

// Opciones de Cargos
const positionOptions = computed(() => {
  return positionsStore.positions.map(pos => ({
    label: pos.name,
    value: pos.id
  }))
})

// Opciones de Comedores
const warehouseOptions = computed(() => {
  return warehousesStore.localWarehouses.map(w => ({
    label: w.name,
    value: w.id
  }))
})

// Opciones de Dependencias y Subdependencias (Solo para Admin Global)
const dependencyOptions = computed(() => {
  return depStore.dependencies
})

// Esquema dinámico para el Smart Filter
const smartFilterSchema = computed(() => [
  { 
    key: 'warehouseId', 
    label: 'Comedor Base', 
    type: 'select', 
    options: warehouseOptions.value,
    colSpan: 4
  },
  { 
    key: 'positionId', 
    label: 'Cargo', 
    type: 'select', 
    options: positionOptions.value,
    colSpan: 4
  },
  { 
    key: 'rationType', 
    label: 'Tipo de Ración', 
    type: 'select', 
    options: rationOptions,
    colSpan: 4
  }
])

// Opciones de subdependencia para los filtros de la tabla
const filterSubdependencyOptions = computed(() => {
  if (!filterDependencyId.value) return []
  const dep = depStore.dependencies.find(d => d.id === filterDependencyId.value)
  return dep?.subdependencies || []
})

const subdependencyOptions = computed(() => {
  let depId = formData.value.dependencyId
  
  // Si no seleccionaron dependencia (porque están en el v-else-if), 
  // autodetectamos a qué dependencia pertenece su subdependencyId
  if (!depId && authStore.user?.dependencyId) {
    depId = authStore.user.dependencyId
  } else if (!depId && authStore.user?.subdependencyId) {
    for (const dep of depStore.dependencies) {
      if (dep.subdependencies?.some(sub => sub.id === authStore.user!.subdependencyId)) {
        depId = dep.id
        break
      }
    }
  }
  
  if (!depId) return []
  const dep = depStore.dependencies.find(d => d.id === depId)
  return dep?.subdependencies || []
})

// Computado para mostrar el nombre de la subdependencia del usuario logueado
const userSubdependencyName = computed(() => {
  if (authStore.user?.subdependencyId) {
    for (const dep of depStore.dependencies) {
      const sub = dep.subdependencies?.find(s => s.id === authStore.user.subdependencyId)
      if (sub) return sub.name
    }
  }
  return ''
})

const userDependencyName = computed(() => {
  if (authStore.user?.subdependencyId) {
    for (const dep of depStore.dependencies) {
      if (dep.subdependencies?.some(sub => sub.id === authStore.user.subdependencyId)) {
        return dep.name
      }
    }
  }
  return ''
})

const columns = [
  { name: 'cedula', label: 'Cédula', field: 'cedula', align: 'left', sortable: true },
  { name: 'name', label: 'Nombre Completo', field: 'name', align: 'left', sortable: true },
  { name: 'warehouse', label: 'Comedor Base', field: (row: any) => row.warehouse?.name || 'No Asignado', align: 'left', sortable: true },
  { name: 'position', label: 'Cargo', field: (row: any) => row.position?.name || 'Sin Cargo', align: 'left', sortable: true },
  { name: 'rationType', label: 'Tipo de Ración', field: 'rationType', align: 'center' },
  { name: 'actions', label: 'Opciones', field: 'actions', align: 'center' }
]

const deleteDiner = (diner: any) => {
  $q.dialog({
    title: 'Confirmar',
    message: `¿Estás seguro de eliminar al trabajador ${diner.name}?`,
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      await dinersStore.deleteDiner(diner.id)
      $q.notify({ type: 'positive', message: 'Trabajador eliminado exitosamente' })
    } catch (error: any) {
      $q.notify({ type: 'negative', message: error.data?.message || 'Error al eliminar trabajador' })
    }
  })
}

// Método de filtrado local personalizado para q-table
const customFilter = (rows: readonly any[], terms: any) => {
  return rows.filter(row => {
    // 1. Filtrado por texto libre (Cédula o Nombre)
    if (terms.search) {
      const s = terms.search.toLowerCase()
      const matchCedula = row.cedula?.toLowerCase().includes(s)
      const matchName = row.name?.toLowerCase().includes(s)
      if (!matchCedula && !matchName) return false
    }
    
    // 2. Filtrado exacto por Selects
    if (terms.warehouseId && row.warehouseId !== terms.warehouseId) return false
    if (terms.positionId && row.positionId !== terms.positionId) return false
    if (terms.rationType && row.rationType !== terms.rationType) return false
    
    return true
  })
}

// Watchers para los filtros de Admin Global
watch(filterDependencyId, (newVal) => {
  // Al cambiar la dependencia, limpiamos la subdependencia y la tabla
  filterSubdependencyId.value = null
  if (newVal) {
    dinersStore.fetchAll({ dependencyId: newVal })
  } else {
    dinersStore.diners = []
  }
})

watch(filterSubdependencyId, (newVal) => {
  if (newVal) {
    dinersStore.fetchAll({ subdependencyId: newVal })
  } else if (filterDependencyId.value) {
    dinersStore.fetchAll({ dependencyId: filterDependencyId.value })
  } else {
    dinersStore.diners = []
  }
})

onMounted(() => {
  squadsStore.fetchAll()
  positionsStore.fetchPositions()
  warehousesStore.fetchAll()
  depStore.fetchAll()
  
  // Solo cargamos los comensales automáticamente si NO es un Admin Global puro
  // (es decir, si es supervisor o admin asignado a una subdependencia, o si es Gerente asignado a una dependencia)
  if (!authStore.user?.role?.isGlobal || authStore.user?.subdependencyId || authStore.user?.dependencyId) {
    dinersStore.fetchAll()
  }
})
</script>

<template>
  <q-page class="q-pa-lg">
    <div class="row q-col-gutter-md">
      <div class="col-12">
        <q-card flat bordered>
          <q-card-section class="row items-center q-pb-none">
            <div class="text-h6">Directorio de Comensales</div>
            <q-space />
            <div class="q-gutter-sm">
              <q-btn color="primary" icon="person_add" label="Registrar Trabajador" @click="openDialog" />
              <q-btn color="secondary" outline icon="upload_file" label="Importar Excel" @click="openExcelModal" />
            </div>
          </q-card-section>
          
          <q-card-section>
            <!-- Panel de Filtros y Búsqueda -->
            <div class="row q-col-gutter-md q-mb-md">
              <template v-if="authStore.user?.role?.isGlobal && !authStore.user?.subdependencyId">
                <div class="col-12 col-md-4">
                  <q-select
                    v-model="filterDependencyId"
                    :options="dependencyOptions"
                    option-value="id"
                    option-label="name"
                    label="Filtrar por Dependencia"
                    emit-value
                    map-options
                    outlined
                    dense
                    clearable
                  />
                </div>
                <div class="col-12 col-md-4">
                  <q-select
                    v-model="filterSubdependencyId"
                    :options="filterSubdependencyOptions"
                    option-value="id"
                    option-label="name"
                    label="Subdependencia"
                    emit-value
                    map-options
                    outlined
                    dense
                    clearable
                    :disable="!filterDependencyId"
                  />
                </div>
              </template>
              
              <div :class="authStore.user?.role?.isGlobal && !authStore.user?.subdependencyId ? 'col-12 col-md-4' : 'col-12 col-md-4 offset-md-8'">
                <q-input
                  v-model="filterState.search"
                  dense
                  outlined
                  placeholder="Buscar por cédula o nombre..."
                  clearable
                >
                  <template v-slot:prepend>
                    <q-icon name="search" />
                  </template>
                </q-input>
              </div>
            </div>

            <!-- Smart Filter -->
            <SharedSmartFilter 
              :schema="smartFilterSchema"
              v-model="filterState"
            />

            <q-table
              :rows="dinersStore.diners"
              :columns="columns"
              :loading="dinersStore.isLoading"
              :filter="filterState"
              :filter-method="customFilter"
              row-key="id"
              flat
              bordered
              no-data-label="Registra a tu primer trabajador usando el botón de arriba."
            >
              <template v-slot:body-cell-actions="props">
                <q-td :props="props">
                  <q-btn 
                    flat 
                    round 
                    :color="props.row.fingerprint ? 'positive' : 'grey-7'" 
                    icon="fingerprint" 
                    size="sm" 
                    @click="openBiometricModal(props.row)"
                  >
                    <q-tooltip>{{ props.row.fingerprint ? 'Actualizar Huella' : 'Registrar Huella' }}</q-tooltip>
                  </q-btn>
                  <q-btn flat round color="primary" icon="edit" size="sm" @click="openEditDialog(props.row)">
                    <q-tooltip>Editar Trabajador</q-tooltip>
                  </q-btn>
                  <q-btn flat round color="negative" icon="delete" size="sm" @click="deleteDiner(props.row)">
                    <q-tooltip>Eliminar Trabajador</q-tooltip>
                  </q-btn>
                </q-td>
              </template>
            </q-table>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Modal de Importación Excel -->
    <SharedDinerExcelUploader 
      v-model="isModalOpen"
      :is-processing="isProcessing"
      :is-validation-screen="isValidationScreen"
      :valid-rows="validRows"
      :invalid-rows="invalidRows"
      :upload-progress="uploadProgress"
      @file-selected="parseExcel"
      @confirm-import="confirmImport"
      @cancel-validation="cancelValidation"
      @download-template="downloadTemplate"
    />

    <!-- Modal para Nuevo/Editar Trabajador -->
    <q-dialog v-model="showDialog" persistent>
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">{{ isEdit ? 'Editar Comensal' : 'Alta de Comensal' }}</div>
        </q-card-section>

        <q-card-section class="q-pt-none q-gutter-md">
          <q-input 
            v-model="formData.cedula" 
            label="Cédula de Identidad" 
            outlined 
            dense 
            autofocus 
          />
          <q-input 
            v-model="formData.name" 
            label="Nombres y Apellidos" 
            outlined 
            dense 
          />
          <q-select
            v-model="formData.rationType"
            :options="rationOptions"
            emit-value
            map-options
            label="Tipo de Dieta/Ración"
            outlined
            dense
          />
          <q-select
            v-model="formData.positionId"
            :options="positionOptions"
            emit-value
            map-options
            label="Cargo / Puesto de Trabajo"
            outlined
            dense
            clearable
          />
          <q-select
            v-model="formData.warehouseId"
            :options="warehouseOptions"
            emit-value
            map-options
            label="Comedor Base *"
            outlined
            dense
          />
          <!-- Cascada de Dependencias para Admins Globales -->
          <template v-if="authStore.user?.role?.isGlobal && !authStore.user?.subdependencyId && !authStore.user?.dependencyId">
            <q-select
              v-model="formData.dependencyId"
              :options="dependencyOptions"
              option-value="id"
              option-label="name"
              emit-value
              map-options
              label="Dependencia Principal"
              outlined
              dense
              clearable
              @update:model-value="formData.subdependencyId = null"
            />
            <q-select
              v-model="formData.subdependencyId"
              :options="subdependencyOptions"
              option-value="id"
              option-label="name"
              emit-value
              map-options
              label="Subdependencia (Requerido para Admins)"
              outlined
              dense
              clearable
              :disable="!formData.dependencyId"
            />
          </template>
          <template v-else-if="authStore.user?.dependencyId && !authStore.user?.subdependencyId">
            <q-select
              v-model="formData.subdependencyId"
              :options="subdependencyOptions"
              option-value="id"
              option-label="name"
              emit-value
              map-options
              label="Subdependencia"
              outlined
              dense
              hint="Restringido a su Dependencia (Gerente)"
            />
          </template>
          <template v-else-if="authStore.user?.subdependencyId">
            <q-select
              v-model="formData.subdependencyId"
              :options="subdependencyOptions"
              option-value="id"
              option-label="name"
              emit-value
              map-options
              label="Subdependencia Asignada"
              outlined
              dense
              :hint="`Dependencia: ${userDependencyName}`"
            />
          </template>
          <q-select
            v-model="formData.squadId"
            :options="squadOptions"
            emit-value
            map-options
            label="Asignar a Cuadrilla"
            outlined
            dense
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancelar" color="grey" v-close-popup />
          <q-btn flat :label="isEdit ? 'Guardar Cambios' : 'Registrar'" color="primary" @click="submit" :loading="dinersStore.isLoading" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Modal de Registro Biométrico -->
    <BiometricRegistrationModal
      v-model="isBiometricModalOpen"
      :diner-id="biometricDinerId"
      :diner-name="biometricDinerName"
    />
  </q-page>
</template>
