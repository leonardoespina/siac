<template>
  <q-page padding>
    <div class="text-h4 text-weight-bold q-mb-md text-primary">Unidades de Medida</div>

    <SharedCrudTable
      title="Gestión de Unidades"
      :columns="columns"
      :rows="store.units"
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

    <SharedFormDialog
      v-model="isDialogOpen"
      :title="isEditing ? 'Editar Unidad' : 'Nueva Unidad'"
      @save="submit"
    >
      <q-input
        v-model="form.name"
        label="Nombre (Ej: Kilogramos) *"
        outlined
        dense
        autofocus
        :rules="[val => !!val || 'El nombre es requerido']"
      />
      <q-input
        v-model="form.abbreviation"
        label="Abreviación (Ej: KG) *"
        outlined
        dense
        class="q-mt-md"
        style="text-transform: uppercase;"
        :rules="[val => !!val || 'La abreviación es requerida']"
      />
      <q-toggle
        v-if="isEditing"
        v-model="form.active"
        label="Unidad Activa"
        class="q-mt-md"
      />
    </SharedFormDialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUnitsStore } from '~/stores/units'
import { useUnitForm } from '~/composables/features/useUnitForm'

const store = useUnitsStore()
const { isDialogOpen, isEditing, form, openCreate, openEdit, submit, remove } = useUnitForm()

const filter = ref('')

const columns = [
  { name: 'id', label: 'ID', field: 'id', align: 'left', sortable: true },
  { name: 'name', label: 'Nombre', field: 'name', align: 'left', sortable: true },
  { name: 'abbreviation', label: 'Abreviación', field: 'abbreviation', align: 'left', sortable: true },
  { name: 'status', label: 'Estado', field: 'active', align: 'center', sortable: true },
  { name: 'actions', label: 'Acciones', align: 'right' }
]

onMounted(() => {
  store.fetchAll()
})
</script>
