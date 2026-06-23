<template>
  <q-page padding>
    <div class="text-h4 text-weight-bold q-mb-md text-primary">Roles y Permisos</div>

    <SharedCrudTable
      title="Listado de Roles"
      :columns="columns"
      :rows="store.roles"
      :filter="filter"
      @update:filter="filter = $event"
      @add="openCreate"
    >
      <template v-slot:body-cell-actions="props">
        <q-td :props="props" class="text-right">
          <q-btn flat round dense color="primary" icon="edit" @click="openEdit(props.row)" />
          <q-btn flat round dense color="negative" icon="delete" @click="deleteRole(props.row.id)" />
        </q-td>
      </template>
      <template v-slot:body-cell-isGlobal="props">
        <q-td :props="props" class="text-center">
          <q-icon :name="props.row.isGlobal ? 'check_circle' : 'cancel'" :color="props.row.isGlobal ? 'positive' : 'grey'" size="sm" />
        </q-td>
      </template>
    </SharedCrudTable>

    <!-- Modal Formulario de Rol -->
    <SharedFormDialog
      v-model="isOpen"
      :title="isEditing ? 'Editar Rol' : 'Nuevo Rol'"
      :loading="loading"
      @save="submit"
    >
      <div class="row q-col-gutter-md q-mb-md">
        <div class="col-12 col-md-6">
          <q-input v-model="form.name" label="Nombre del Rol (Ej: GERENTE)" outlined dense :rules="[val => !!val || 'Requerido']" />
        </div>
        <div class="col-12 col-md-6">
          <q-input v-model="form.description" label="Descripción (Opcional)" outlined dense />
        </div>
        <div class="col-12">
          <q-checkbox v-model="form.isGlobal" label="Administrador Global (Modo Dios: acceso a todo)" color="warning" />
        </div>
      </div>

      <div class="text-subtitle1 q-mt-md q-mb-sm text-primary text-weight-bold">Matriz de Permisos por Módulo</div>
      <q-separator class="q-mb-sm" />
      
      <!-- Matriz de permisos -->
      <div v-for="(perm, index) in form.permissions" :key="perm.moduleId" class="row items-center q-mb-sm q-py-sm" style="border-bottom: 1px solid #eee;">
        <div class="col-12 col-md-4 text-weight-medium q-mb-xs q-mb-md-none">
          {{ getModuleName(perm.moduleId) }}
        </div>
        <div class="col-12 col-md-8 row q-col-gutter-sm">
          <div class="col-6 col-sm-3"><q-checkbox v-model="form.permissions[index].canCreate" label="Crear" color="primary" dense /></div>
          <div class="col-6 col-sm-3"><q-checkbox v-model="form.permissions[index].canRead" label="Leer" color="primary" dense /></div>
          <div class="col-6 col-sm-3"><q-checkbox v-model="form.permissions[index].canUpdate" label="Editar" color="primary" dense /></div>
          <div class="col-6 col-sm-3"><q-checkbox v-model="form.permissions[index].canDelete" label="Borrar" color="negative" dense /></div>
        </div>
      </div>
    </SharedFormDialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRolesStore } from '~/stores/roles'
import { useRoleForm } from '~/composables/features/useRoleForm'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const store = useRolesStore()
const { isOpen, isEditing, loading, form, openCreate, openEdit, submit } = useRoleForm()

const filter = ref('')

const columns = [
  { name: 'name', label: 'Nombre', field: 'name', align: 'left', sortable: true },
  { name: 'description', label: 'Descripción', field: 'description', align: 'left' },
  { name: 'isGlobal', label: '¿Global?', field: 'isGlobal', align: 'center', sortable: true },
  { name: 'actions', label: 'Acciones', align: 'right' }
]

const getModuleName = (moduleId: number) => {
  const m = store.modules.find(mod => mod.id === moduleId)
  return m ? m.name : 'Desconocido'
}

const deleteRole = (id: number) => {
  $q.dialog({
    title: 'Confirmar Eliminación',
    message: '¿Eliminar este rol? Si hay usuarios con este rol asignado, el sistema rechazará la eliminación.',
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      await store.deleteRole(id)
    } catch (e: any) {
      $q.notify({ type: 'negative', message: e.data?.message || 'Error al eliminar' })
    }
  })
}

onMounted(async () => {
  await Promise.all([
    store.fetchRoles(),
    store.fetchModules()
  ])
})
</script>
