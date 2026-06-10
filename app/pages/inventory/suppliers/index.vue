<template>
  <q-page padding>
    <div class="text-h4 text-weight-bold q-mb-md text-primary">Proveedores</div>

    <SharedCrudTable
      title="Directorio de Proveedores"
      :columns="columns"
      :rows="store.suppliers"
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
      :title="isEditing ? 'Editar Proveedor' : 'Nuevo Proveedor'"
      @save="submit"
    >
      <div class="row q-col-gutter-md">
        <div class="col-12 col-md-4">
          <q-input v-model="form.document" label="RIF / NIT *" outlined dense autofocus :rules="[val => !!val || 'Requerido']" />
        </div>
        <div class="col-12 col-md-8">
          <q-input v-model="form.name" label="Razón Social *" outlined dense :rules="[val => !!val || 'Requerido']" />
        </div>
      </div>
      <div class="row q-col-gutter-md q-mt-sm">
        <div class="col-12 col-md-6">
          <q-input v-model="form.phone" label="Teléfono" outlined dense />
        </div>
        <div class="col-12 col-md-6">
          <q-input v-model="form.email" label="Correo Electrónico" type="email" outlined dense />
        </div>
      </div>
      <q-input v-model="form.address" label="Dirección Fiscal" type="textarea" outlined dense class="q-mt-md" />

      <q-toggle v-if="isEditing" v-model="form.active" label="Proveedor Activo" class="q-mt-md" />
    </SharedFormDialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSuppliersStore } from '~/stores/suppliers'
import { useSupplierForm } from '~/composables/features/useSupplierForm'

const store = useSuppliersStore()
const { isDialogOpen, isEditing, form, openCreate, openEdit, submit, remove } = useSupplierForm()

const filter = ref('')

const columns = [
  { name: 'document', label: 'RIF/NIT', field: 'document', align: 'left', sortable: true },
  { name: 'name', label: 'Razón Social', field: 'name', align: 'left', sortable: true },
  { name: 'phone', label: 'Teléfono', field: 'phone', align: 'left' },
  { name: 'status', label: 'Estado', field: 'active', align: 'center', sortable: true },
  { name: 'actions', label: 'Acciones', align: 'right' }
]

onMounted(() => {
  store.fetchAll()
})
</script>
