<template>
  <q-page padding>
    <div class="row items-center justify-between q-mb-md">
      <div class="text-h5 text-primary text-weight-bold">Catálogo de Instituciones</div>
      <q-btn v-if="auth.hasPermission('INSTITUTIONS', 'canCreate')" color="primary" icon="add" label="Nueva Institución" @click="openDialog()" />
    </div>

    <q-table
      :rows="institutions"
      :columns="columns"
      row-key="id"
      :loading="loading"
      flat bordered
      :pagination="{ rowsPerPage: 10 }"
    >
      <template v-slot:body-cell-active="props">
        <q-td :props="props">
          <q-badge :color="props.row.active ? 'positive' : 'negative'">
            {{ props.row.active ? 'Activo' : 'Inactivo' }}
          </q-badge>
        </q-td>
      </template>

      <template v-slot:body-cell-actions="props">
        <q-td :props="props" class="q-gutter-xs">
          <q-btn v-if="auth.hasPermission('INSTITUTIONS', 'canUpdate')" flat round color="primary" icon="edit" size="sm" @click="openDialog(props.row)" />
          <q-btn v-if="auth.hasPermission('INSTITUTIONS', 'canDelete')" flat round color="negative" icon="delete" size="sm" @click="confirmDelete(props.row)" />
        </q-td>
      </template>
    </q-table>

    <!-- Dialog -->
    <SharedFormDialog
      v-model="isDialogOpen"
      :title="formData.id ? 'Editar Institución' : 'Nueva Institución'"
      :loading="saving"
      save-label="Guardar"
      @save="onSave"
    >
      <q-input v-model="formData.name" label="Nombre de la Institución *" outlined dense autofocus :rules="[val => !!val || 'Requerido']" />
      <q-select v-model="formData.type" :options="['Educativa', 'Salud', 'Comunitaria', 'Gubernamental', 'Religiosa', 'Otra']" label="Tipo de Institución" outlined dense class="q-mt-md" />
      <q-input v-model="formData.description" label="Descripción / Ubicación" outlined dense class="q-mt-md" type="textarea" />
      <q-toggle v-model="formData.active" label="Activo" class="q-mt-md" />
    </SharedFormDialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useInstitutions } from '~/composables/features/useInstitutions'
import { useQuasar } from 'quasar'

const auth = useAuthStore()
const $q = useQuasar()
const { loading, saving, institutions, fetchInstitutions, saveInstitution, deleteInstitution } = useInstitutions()

const columns = [
  { name: 'id', label: 'ID', field: 'id', sortable: true, align: 'left' as const },
  { name: 'name', label: 'Nombre', field: 'name', sortable: true, align: 'left' as const },
  { name: 'type', label: 'Tipo', field: 'type', sortable: true, align: 'left' as const },
  { name: 'active', label: 'Estado', field: 'active', sortable: true, align: 'center' as const },
  { name: 'actions', label: 'Acciones', field: 'actions', align: 'center' as const }
]

const isDialogOpen = ref(false)
const formData = ref<any>({ id: null, name: '', type: 'Otra', description: '', active: true })

onMounted(() => {
  fetchInstitutions()
})

const openDialog = (row?: any) => {
  if (row) {
    formData.value = { ...row }
  } else {
    formData.value = { id: null, name: '', type: 'Otra', description: '', active: true }
  }
  isDialogOpen.value = true
}

const onSave = async () => {
  const success = await saveInstitution(formData.value.id, formData.value)
  if (success) isDialogOpen.value = false
}

const confirmDelete = (row: any) => {
  $q.dialog({
    title: 'Confirmar eliminación',
    message: `¿Estás seguro de que deseas eliminar la institución "${row.name}"?`,
    cancel: true,
    persistent: true
  }).onOk(() => {
    deleteInstitution(row.id)
  })
}
</script>
