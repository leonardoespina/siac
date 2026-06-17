<template>
  <q-page padding>
    <div class="text-h4 text-weight-bold q-mb-md text-primary">Usuarios</div>

    <SharedCrudTable
      title="Listado de Usuarios"
      :columns="columns"
      :rows="store.users"
      :filter="filter"
      @update:filter="filter = $event"
      @add="openCreate"
    >
      <template v-slot:body-cell-role="props">
        <q-td :props="props">
          <q-badge color="primary" :label="props.row.role?.name" />
        </q-td>
      </template>
      
      <template v-slot:body-cell-warehouse="props">
        <q-td :props="props">
          <span v-if="props.row.warehouseId">{{ props.row.warehouse?.name || 'Comedor Asignado' }}</span>
          <span v-else class="text-grey text-italic">Global</span>
        </q-td>
      </template>
      
      <template v-slot:body-cell-status="props">
        <q-td :props="props">
          <SharedStatusBadge :active="props.row.active" />
        </q-td>
      </template>

      <template v-slot:body-cell-actions="props">
        <q-td :props="props" class="text-right">
          <q-btn flat round dense color="primary" icon="edit" @click="openEdit(props.row)" />
          <q-btn flat round dense color="negative" icon="delete" @click="deleteUser(props.row.id)" />
        </q-td>
      </template>
    </SharedCrudTable>

    <!-- Modal Formulario de Usuario -->
    <SharedFormDialog
      v-model="isOpen"
      :title="isEditing ? 'Editar Usuario' : 'Nuevo Usuario'"
      :loading="loading"
      @save="submit"
    >
      <div class="row q-col-gutter-md">
        <div class="col-12 col-md-6">
          <q-input v-model="form.cedula" label="Cédula" outlined dense :rules="[val => !!val || 'Requerido']" />
        </div>
        <div class="col-12 col-md-6">
          <q-input v-model="form.name" label="Nombre" outlined dense :rules="[val => !!val || 'Requerido']" />
        </div>
        <div class="col-12 col-md-6">
          <q-select 
            v-model="form.roleId" 
            :options="rolesStore.roles" 
            option-value="id" 
            option-label="name" 
            emit-value 
            map-options 
            label="Rol del Usuario" 
            outlined 
            dense 
            :rules="[val => !!val || 'Requerido']" 
          />
        </div>
        <div class="col-12 col-md-6">
          <q-select 
            v-model="form.warehouseId" 
            :options="[{id: null, name: 'Ninguno (Acceso Global)'}, ...warehousesStore.localWarehouses]" 
            option-value="id" 
            option-label="name" 
            emit-value 
            map-options 
            label="Comedor Asignado (Opcional)" 
            outlined 
            dense 
          />
        </div>
        <div class="col-12" v-if="isEditing">
          <q-input v-model="form.password" label="Nueva Contraseña (Dejar en blanco si no se cambia)" outlined dense type="password" />
        </div>
        <div class="col-12" v-if="isEditing">
          <q-toggle v-model="form.active" label="Usuario Activo" color="positive" />
        </div>
      </div>
    </SharedFormDialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUsersStore } from '~/stores/users'
import { useRolesStore } from '~/stores/roles'
import { useWarehousesStore } from '~/stores/warehouses'
import { useUserForm } from '~/composables/features/useUserForm'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const store = useUsersStore()
const rolesStore = useRolesStore()
const warehousesStore = useWarehousesStore()
const { isOpen, isEditing, loading, form, openCreate, openEdit, submit } = useUserForm()

const filter = ref('')

const columns = [
  { name: 'cedula', label: 'Cédula', field: 'cedula', align: 'left', sortable: true },
  { name: 'name', label: 'Nombre', field: 'name', align: 'left', sortable: true },
  { name: 'role', label: 'Rol', field: 'role', align: 'center', sortable: true },
  { name: 'warehouse', label: 'Comedor Asignado', field: 'warehouse', align: 'center' },
  { name: 'status', label: 'Estado', field: 'active', align: 'center', sortable: true },
  { name: 'actions', label: 'Acciones', align: 'right' }
]

const deleteUser = (id: number) => {
  $q.dialog({
    title: 'Confirmar',
    message: '¿Estás seguro de desactivar este usuario? Será un borrado lógico para mantener la auditoría.',
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      await store.deleteUser(id)
    } catch (e: any) {
      $q.notify({ type: 'negative', message: e.data?.message || 'Error al eliminar' })
    }
  })
}

onMounted(async () => {
  await Promise.all([
    store.fetchUsers(),
    rolesStore.fetchRoles(), // Necesitamos los roles para llenar el select
    warehousesStore.fetchAll() // Necesitamos los comedores para el select
  ])
})
</script>
