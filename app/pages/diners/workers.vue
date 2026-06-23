<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useSquadsStore } from '~/stores/squads'
import { useDinersStore } from '~/stores/diners'
import { useDependenciesStore } from '~/stores/dependencies'
import { useAuthStore } from '~/stores/auth'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const squadsStore = useSquadsStore()
const dinersStore = useDinersStore()
const depStore = useDependenciesStore()
const authStore = useAuthStore()

const showDialog = ref(false)
const isEdit = ref(false)
const editId = ref<number | null>(null)

const formData = ref({
  cedula: '',
  name: '',
  rationType: 'NORMAL',
  squadId: null as number | null,
  dependencyId: null as number | null,
  subdependencyId: null as number | null
})

// Opciones de Ración
const rationOptions = [
  { label: 'Normal (Plato Estándar)', value: 'NORMAL' },
  { label: 'Dieta Médica', value: 'DIET' }
]

// Extraemos las cuadrillas globales para el Select
const squadOptions = computed(() => {
  return squadsStore.squads.map(squad => ({
    label: squad.name,
    value: squad.id
  }))
})

// Opciones de Dependencias y Subdependencias (Solo para Admin Global)
const dependencyOptions = computed(() => {
  return depStore.dependencies
})

const subdependencyOptions = computed(() => {
  let depId = formData.value.dependencyId
  
  // Si no seleccionaron dependencia (porque están en el v-else-if), 
  // autodetectamos a qué dependencia pertenece su subdependencyId
  if (!depId && authStore.user?.subdependencyId) {
    for (const dep of depStore.dependencies) {
      if (dep.subdependencies?.some(sub => sub.id === authStore.user.subdependencyId)) {
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

const openDialog = () => {
  isEdit.value = false
  editId.value = null
  formData.value = {
    cedula: '',
    name: '',
    rationType: 'NORMAL',
    squadId: null,
    dependencyId: null,
    subdependencyId: authStore.user?.subdependencyId || null
  }
  showDialog.value = true
}

// Por brevedad en esta fase, mostramos los comensales desde el depStore
// (Ya que getSquadsBySubdependency devuelve el _count, pero no la lista plana todavía. 
//  Normalmente usaríamos getters o fetchDiners. Dejaremos la tabla vacía en esta fase o solo de los recién agregados localmente)
const columns = [
  { name: 'cedula', label: 'Cédula', field: 'cedula', align: 'left', sortable: true },
  { name: 'name', label: 'Nombre Completo', field: 'name', align: 'left', sortable: true },
  { name: 'rationType', label: 'Tipo de Ración', field: 'rationType', align: 'center' },
  { name: 'actions', label: 'Opciones', field: 'actions', align: 'center' }
]

const openEditDialog = (diner: any) => {
  isEdit.value = true
  editId.value = diner.id
  formData.value = {
    cedula: diner.cedula,
    name: diner.name,
    rationType: diner.rationType,
    squadId: diner.squadId,
    dependencyId: null, // Si es admin, tendría que re-mapearse, pero simplificamos dejando null para que no rompa
    subdependencyId: diner.subdependencyId
  }
  showDialog.value = true
}

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

const submit = async () => {
  if (!formData.value.cedula || !formData.value.name || !formData.value.squadId) {
    $q.notify({ type: 'warning', message: 'Llene todos los campos requeridos.' })
    return
  }
  
  if (authStore.user?.role?.isGlobal && !authStore.user?.subdependencyId && !formData.value.subdependencyId) {
    $q.notify({ type: 'warning', message: 'Como Administrador Global, debes seleccionar a qué subdependencia pertenecerá el trabajador.' })
    return
  }

  try {
    if (isEdit.value && editId.value) {
      await dinersStore.updateDiner(editId.value, {
        cedula: formData.value.cedula,
        name: formData.value.name,
        rationType: formData.value.rationType,
        squadId: formData.value.squadId!
      })
      $q.notify({ type: 'positive', message: 'Comensal actualizado exitosamente' })
    } else {
      const result = await $fetch('/api/diners', {
        method: 'POST',
        body: { 
          cedula: formData.value.cedula,
          name: formData.value.name,
          rationType: formData.value.rationType,
          squadId: formData.value.squadId,
          subdependencyId: formData.value.subdependencyId
        }
      })
      dinersStore.diners.push(result as any)
      $q.notify({ type: 'positive', message: 'Comensal registrado exitosamente' })
    }
    
    showDialog.value = false
    formData.value.cedula = ''
    formData.value.name = ''
    formData.value.squadId = null
    formData.value.subdependencyId = null
  } catch (error: any) {
    $q.notify({ type: 'negative', message: error.data?.message || 'Error al registrar comensal' })
  }
}

onMounted(() => {
  squadsStore.fetchAll()
  dinersStore.fetchAll()
  depStore.fetchAll()
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
            <q-btn color="primary" icon="person_add" label="Registrar Trabajador" @click="openDialog" />
          </q-card-section>
          
          <q-card-section>
            <q-table
              :rows="dinersStore.diners"
              :columns="columns"
              :loading="dinersStore.isLoading"
              row-key="id"
              flat
              bordered
              no-data-label="Registra a tu primer trabajador usando el botón de arriba."
            >
              <template v-slot:body-cell-actions="props">
                <q-td :props="props">
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
          <!-- Cascada de Dependencias para Admins Globales -->
          <template v-if="authStore.user?.role?.isGlobal && !authStore.user?.subdependencyId">
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
  </q-page>
</template>
