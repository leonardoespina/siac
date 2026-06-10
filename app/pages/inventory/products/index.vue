<template>
  <q-page padding>
    <div class="text-h4 text-weight-bold q-mb-md text-primary">Catálogo de Productos</div>

    <SharedCrudTable
      title="Productos Maestros"
      :columns="columns"
      :rows="store.products"
      :filter="filter"
      :loading="store.loading"
      @update:filter="filter = $event"
      @add="openCreate"
    >
      <template v-slot:body-cell-category="props">
        <q-td :props="props">
          <q-badge color="indigo" :label="props.row.category?.name" />
        </q-td>
      </template>

      <template v-slot:body-cell-unit="props">
        <q-td :props="props">
          {{ props.row.unit?.abbreviation }}
        </q-td>
      </template>

      <template v-slot:body-cell-perishable="props">
        <q-td :props="props" class="text-center">
          <q-icon :name="props.row.isPerishable ? 'check_circle' : 'cancel'" :color="props.row.isPerishable ? 'positive' : 'grey'" size="sm" />
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

    <!-- Dialogo de Formulario con Tabs para no saturar visualmente -->
    <SharedFormDialog
      v-model="isDialogOpen"
      :title="isEditing ? 'Editar Producto' : 'Nuevo Producto'"
      @save="submit"
    >
      <div class="row q-col-gutter-md">
        <div class="col-12 col-md-4">
          <q-input v-model="form.code" label="Código/SKU *" outlined dense autofocus :rules="[val => !!val || 'Requerido']" />
        </div>
        <div class="col-12 col-md-8">
          <q-input v-model="form.name" label="Nombre del Producto *" outlined dense :rules="[val => !!val || 'Requerido']" />
        </div>
      </div>
      
      <div class="row q-col-gutter-md q-mt-sm">
        <div class="col-12 col-md-6">
          <q-select
            v-model="form.categoryId"
            :options="categoriesStore.categories"
            option-value="id"
            option-label="name"
            emit-value
            map-options
            label="Categoría *"
            outlined dense
            :rules="[val => !!val || 'Requerida']"
          />
        </div>
        <div class="col-12 col-md-6">
          <q-select
            v-model="form.unitId"
            :options="unitsStore.units"
            option-value="id"
            option-label="abbreviation"
            emit-value
            map-options
            label="Unidad de Medida *"
            outlined dense
            :rules="[val => !!val || 'Requerida']"
          />
        </div>
      </div>

      <div class="row q-col-gutter-md q-mt-sm">
        <div class="col-12 col-md-6">
          <q-input v-model.number="form.minimumStock" type="number" label="Stock Mínimo" outlined dense />
        </div>
        <div class="col-12 col-md-6">
          <q-input v-model.number="form.maximumStock" type="number" label="Stock Máximo" outlined dense />
        </div>
      </div>

      <q-input v-model="form.description" label="Descripción (Opcional)" type="textarea" outlined dense class="q-mt-md" />

      <div class="row q-mt-md">
        <q-toggle v-model="form.isPerishable" label="Es producto perecedero (Requiere fecha de caducidad al recibir)" />
      </div>
      
      <div class="row q-mt-sm" v-if="isEditing">
        <q-toggle v-model="form.active" label="Producto Activo" />
      </div>
    </SharedFormDialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useProductsStore } from '~/stores/products'
import { useCategoriesStore } from '~/stores/categories'
import { useUnitsStore } from '~/stores/units'
import { useProductForm } from '~/composables/features/useProductForm'

const store = useProductsStore()
const categoriesStore = useCategoriesStore()
const unitsStore = useUnitsStore()

const { isDialogOpen, isEditing, form, openCreate, openEdit, submit, remove } = useProductForm()

const filter = ref('')

const columns = [
  { name: 'code', label: 'Código', field: 'code', align: 'left', sortable: true },
  { name: 'name', label: 'Nombre', field: 'name', align: 'left', sortable: true },
  { name: 'category', label: 'Categoría', align: 'center' },
  { name: 'unit', label: 'Und', align: 'center' },
  { name: 'minimumStock', label: 'Min', field: 'minimumStock', align: 'center' },
  { name: 'perishable', label: 'Perecedero', align: 'center' },
  { name: 'status', label: 'Estado', field: 'active', align: 'center', sortable: true },
  { name: 'actions', label: 'Acciones', align: 'right' }
]

onMounted(() => {
  store.fetchAll()
  if (categoriesStore.categories.length === 0) categoriesStore.fetchAll()
  if (unitsStore.units.length === 0) unitsStore.fetchAll()
})
</script>
