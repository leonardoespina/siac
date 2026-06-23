<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useDependenciesStore } from '~/stores/dependencies'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const store = useDependenciesStore()

// Modal para Dependencia Principal
const showDepDialog = ref(false)
const isEditingDep = ref(false)
const depId = ref<number | null>(null)
const depName = ref('')

// Modal para Subdependencia
const showSubDialog = ref(false)
const isEditingSub = ref(false)
const formDataSub = ref({
  id: null as number | null,
  name: '',
  dependencyId: null as number | null
})

// Búsqueda
const filterText = ref('')

const depOptions = computed(() => {
  return store.dependencies.map(dep => ({
    label: dep.name,
    value: dep.id
  }))
})

// Árbol filtrado
const filteredDependencies = computed(() => {
  if (!filterText.value) return store.dependencies

  const lowerFilter = filterText.value.toLowerCase()
  return store.dependencies.map(dep => {
    // Si la dependencia coincide, mostrarla con todas sus subs
    if (dep.name.toLowerCase().includes(lowerFilter)) return dep
    
    // Si no coincide la dependencia, buscar en las subs
    const matchingSubs = dep.subdependencies?.filter(sub => sub.name.toLowerCase().includes(lowerFilter))
    if (matchingSubs && matchingSubs.length > 0) {
      return { ...dep, subdependencies: matchingSubs }
    }
    return null
  }).filter(Boolean) as typeof store.dependencies
})

const openCreateDep = () => {
  isEditingDep.value = false
  depId.value = null
  depName.value = ''
  showDepDialog.value = true
}

const openEditDep = (dep: any) => {
  isEditingDep.value = true
  depId.value = dep.id
  depName.value = dep.name
  showDepDialog.value = true
}

const openCreateSub = () => {
  isEditingSub.value = false
  formDataSub.value = { id: null, name: '', dependencyId: null }
  showSubDialog.value = true
}

const openEditSub = (sub: any) => {
  isEditingSub.value = true
  formDataSub.value = { id: sub.id, name: sub.name, dependencyId: sub.dependencyId }
  showSubDialog.value = true
}

const submitDependency = async () => {
  if (!depName.value) return
  try {
    if (isEditingDep.value && depId.value) {
      await store.updateDependency(depId.value, depName.value)
      $q.notify({ type: 'positive', message: 'Dependencia actualizada' })
    } else {
      await store.createDependency(depName.value)
      $q.notify({ type: 'positive', message: 'Dependencia creada' })
    }
    showDepDialog.value = false
  } catch (error: any) {
    $q.notify({ type: 'negative', message: error.data?.message || 'Error al guardar dependencia' })
  }
}

const submitSubdependency = async () => {
  if (!formDataSub.value.name || !formDataSub.value.dependencyId) return
  try {
    if (isEditingSub.value && formDataSub.value.id) {
      await store.updateSubdependency(formDataSub.value.id, formDataSub.value.dependencyId, formDataSub.value.name)
      $q.notify({ type: 'positive', message: 'Subdependencia actualizada' })
    } else {
      await store.createSubdependency(formDataSub.value.dependencyId, formDataSub.value.name)
      $q.notify({ type: 'positive', message: 'Subdependencia creada' })
    }
    showSubDialog.value = false
  } catch (error: any) {
    $q.notify({ type: 'negative', message: error.data?.message || 'Error al guardar subdependencia' })
  }
}

const confirmDeleteDep = (id: number, name: string) => {
  $q.dialog({
    title: 'Confirmar Eliminación',
    message: `¿Está seguro de eliminar la dependencia "${name}"? Esto podría afectar las subdependencias.`,
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      await store.deleteDependency(id)
      $q.notify({ type: 'positive', message: 'Dependencia eliminada' })
    } catch (error: any) {
      $q.notify({ type: 'negative', message: error.data?.message || 'Error al eliminar' })
    }
  })
}

const confirmDeleteSub = (id: number, name: string) => {
  $q.dialog({
    title: 'Confirmar Eliminación',
    message: `¿Está seguro de desactivar la subdependencia "${name}"?`,
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      await store.deleteSubdependency(id)
      $q.notify({ type: 'positive', message: 'Subdependencia desactivada' })
    } catch (error: any) {
      $q.notify({ type: 'negative', message: error.data?.message || 'Error al eliminar' })
    }
  })
}

onMounted(() => {
  store.fetchAll()
})
</script>

<template>
  <q-page class="q-pa-lg">
    <div class="row q-col-gutter-md">
      <div class="col-12">
        <q-card flat bordered>
          <q-card-section class="row items-center q-pb-none">
            <div class="text-h6">Estructura Organizacional (RRHH)</div>
            <q-space />
            <q-input v-model="filterText" placeholder="Buscar..." outlined dense clearable class="q-mr-md" style="width: 250px">
              <template v-slot:prepend>
                <q-icon name="search" />
              </template>
            </q-input>
            <q-btn color="secondary" icon="account_tree" label="Nueva Subdependencia" @click="openCreateSub" class="q-mr-sm" />
            <q-btn color="primary" icon="domain" label="Nueva Dependencia" @click="openCreateDep" />
          </q-card-section>
          
          <q-card-section>
            <q-list bordered class="rounded-borders">
              <q-expansion-item
                v-for="dep in filteredDependencies"
                :key="dep.id"
                expand-separator
                icon="domain"
                :label="dep.name"
                header-class="text-weight-bold"
              >
                <!-- Botones de Acción para Dependencia -->
                <template v-slot:header>
                  <q-item-section avatar>
                    <q-icon name="domain" />
                  </q-item-section>

                  <q-item-section>
                    <div class="text-weight-bold">{{ dep.name }}</div>
                  </q-item-section>

                  <q-item-section side>
                    <div class="row items-center">
                      <q-btn flat round icon="edit" color="primary" size="sm" @click.stop="openEditDep(dep)">
                        <q-tooltip>Editar Dependencia</q-tooltip>
                      </q-btn>
                      <q-btn flat round icon="delete" color="negative" size="sm" @click.stop="confirmDeleteDep(dep.id, dep.name)">
                        <q-tooltip>Eliminar Dependencia</q-tooltip>
                      </q-btn>
                    </div>
                  </q-item-section>
                </template>

                <q-list v-if="dep.subdependencies && dep.subdependencies.length > 0">
                  <q-item v-for="sub in dep.subdependencies" :key="sub.id" class="q-pl-xl">
                    <q-item-section avatar>
                      <q-icon name="subdirectory_arrow_right" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label>{{ sub.name }}</q-item-label>
                      <q-item-label caption>{{ sub.squads?.length || 0 }} cuadrillas registradas</q-item-label>
                    </q-item-section>
                    
                    <q-item-section side>
                      <div class="row items-center">
                        <q-btn flat round icon="edit" color="primary" size="sm" @click.stop="openEditSub(sub)">
                          <q-tooltip>Editar Subdependencia</q-tooltip>
                        </q-btn>
                        <q-btn flat round icon="delete" color="negative" size="sm" @click.stop="confirmDeleteSub(sub.id, sub.name)">
                          <q-tooltip>Eliminar Subdependencia</q-tooltip>
                        </q-btn>
                      </div>
                    </q-item-section>
                  </q-item>
                </q-list>
                <q-card-section v-else class="text-grey q-pl-xl">
                  No hay subdependencias registradas aquí.
                </q-card-section>
              </q-expansion-item>
            </q-list>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Modal Dependencia -->
    <q-dialog v-model="showDepDialog" persistent>
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">{{ isEditingDep ? 'Editar' : 'Crear' }} Dependencia Principal</div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <q-input v-model="depName" label="Nombre" outlined dense autofocus @keyup.enter="submitDependency" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" color="grey" v-close-popup />
          <q-btn flat label="Guardar" color="primary" @click="submitDependency" :loading="store.isLoading" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Modal Subdependencia -->
    <q-dialog v-model="showSubDialog" persistent>
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">{{ isEditingSub ? 'Editar' : 'Crear' }} Subdependencia</div>
        </q-card-section>
        <q-card-section class="q-pt-none q-gutter-md">
          <q-select
            v-model="formDataSub.dependencyId"
            :options="depOptions"
            emit-value
            map-options
            label="Pertenece a la Dependencia..."
            outlined
            dense
          />
          <q-input v-model="formDataSub.name" label="Nombre" outlined dense @keyup.enter="submitSubdependency" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" color="grey" v-close-popup />
          <q-btn flat label="Guardar" color="primary" @click="submitSubdependency" :loading="store.isLoading" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>
