<template>
  <q-page padding>
    <div class="text-h4 text-weight-bold q-mb-md text-primary">Almacenes</div>

    <SharedCrudTable
      title="Espacios Físicos"
      :columns="columns"
      :rows="store.warehouses"
      :filter="filter"
      :loading="store.loading"
      @update:filter="filter = $event"
      @add="openCreate"
    >
      <template v-slot:body-cell-type="props">
        <q-td :props="props">
          <q-badge :color="props.row.type === 'CENTRAL' ? 'purple' : 'teal'" :label="props.row.type" />
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
          <q-btn flat round dense color="negative" icon="delete" @click="remove(props.row.id)" v-if="props.row.active" />
        </q-td>
      </template>
    </SharedCrudTable>

    <SharedFormDialog
      v-model="isDialogOpen"
      :title="isEditing ? 'Editar Almacén' : 'Nuevo Almacén'"
      @save="submit"
    >
      <q-input
        v-model="form.name"
        label="Nombre del Almacén *"
        outlined
        dense
        autofocus
        :rules="[val => !!val || 'El nombre es requerido']"
      />
      <q-select
        v-model="form.type"
        :options="['CENTRAL', 'LOCAL']"
        label="Tipo de Almacén *"
        outlined
        dense
        class="q-mt-md"
        :rules="[val => !!val || 'El tipo es requerido']"
      />
      <q-input
        v-model="form.location"
        label="Ubicación (Opcional)"
        outlined
        dense
        class="q-mt-md"
      />
      <q-toggle
        v-if="isEditing"
        v-model="form.active"
        label="Almacén Activo"
        class="q-mt-md"
      />
    </SharedFormDialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useWarehousesStore } from '~/stores/warehouses'
import { useWarehouseForm } from '~/composables/features/useWarehouseForm'

const store = useWarehousesStore()
const { isDialogOpen, isEditing, form, openCreate, openEdit, submit, remove } = useWarehouseForm()

const filter = ref('')

const columns = [
  { name: 'name', label: 'Nombre', field: 'name', align: 'left', sortable: true },
  { name: 'type', label: 'Tipo', field: 'type', align: 'center', sortable: true },
  { name: 'location', label: 'Ubicación', field: 'location', align: 'left' },
  { name: 'status', label: 'Estado', field: 'active', align: 'center', sortable: true },
  { name: 'actions', label: 'Acciones', align: 'right' }
]

onMounted(() => {
  store.fetchAll()
})
</script>
