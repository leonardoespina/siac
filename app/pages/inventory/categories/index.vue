<template>
  <q-page padding>
    <div class="text-h4 text-weight-bold q-mb-md text-primary">Categorías</div>

    <SharedCrudTable
      title="Catálogo de Categorías"
      :columns="columns"
      :rows="store.categories"
      :filter="filter"
      :loading="store.loading"
      @update:filter="filter = $event"
      @add="openCreate"
    >
      <template v-slot:body-cell-status="props">
        <q-td :props="props">
          <SharedStatusBadge :active="props.row.active" />
        </q-td>
      </template>

      <template v-slot:body-cell-actions="props">
        <q-td :props="props" class="text-right">
          <q-btn flat round dense color="primary" icon="edit" @click="openEdit(props.row)" />
          <q-btn flat round dense color="negative" icon="delete" @click="remove(props.row.id)" v-if="props.row.active" />
        </q-td>
      </template>
    </SharedCrudTable>

    <!-- Dialogo de Formulario -->
    <SharedFormDialog
      v-model="isDialogOpen"
      :title="isEditing ? 'Editar Categoría' : 'Nueva Categoría'"
      @save="submit"
    >
      <q-input
        v-model="form.name"
        label="Nombre de Categoría *"
        outlined
        dense
        autofocus
        :rules="[val => !!val || 'El nombre es requerido']"
      />
      <q-input
        v-model="form.description"
        label="Descripción (Opcional)"
        outlined
        dense
        type="textarea"
        class="q-mt-md"
      />
      <q-toggle
        v-if="isEditing"
        v-model="form.active"
        label="Categoría Activa"
        class="q-mt-md"
      />
    </SharedFormDialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useCategoriesStore } from '~/stores/categories'
import { useCategoryForm } from '~/composables/features/useCategoryForm'

const store = useCategoriesStore()
const { isDialogOpen, isEditing, form, openCreate, openEdit, submit, remove } = useCategoryForm()

const filter = ref('')

const columns = [
  { name: 'id', label: 'ID', field: 'id', align: 'left', sortable: true },
  { name: 'name', label: 'Nombre', field: 'name', align: 'left', sortable: true },
  { name: 'description', label: 'Descripción', field: 'description', align: 'left' },
  { name: 'status', label: 'Estado', field: 'active', align: 'center', sortable: true },
  { name: 'actions', label: 'Acciones', align: 'right' }
]

onMounted(() => {
  store.fetchAll()
})
</script>
