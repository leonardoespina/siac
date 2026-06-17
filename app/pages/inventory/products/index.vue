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

      <template v-slot:body-cell-centralStock="props">
        <q-td :props="props" class="text-center">
          <q-badge :color="getCentralStock(props.row) < props.row.minimumStock ? 'negative' : 'positive'" class="text-weight-bold" style="font-size: 14px">
            {{ getCentralStock(props.row) }}
            <q-icon name="warning" v-if="getCentralStock(props.row) < props.row.minimumStock" class="q-ml-xs" />
          </q-badge>
        </q-td>
      </template>

      <template v-slot:body-cell-localStock="props">
        <q-td :props="props" class="text-center text-weight-bold text-grey-8">
          {{ getLocalStock(props.row) }}
        </q-td>
      </template>

      <template v-slot:body-cell-actions="props">
        <q-td :props="props" class="text-right">
          <q-btn flat round dense color="teal" icon="insert_chart" @click="openKardex(props.row)">
            <q-tooltip>Ver Kardex / Historial</q-tooltip>
          </q-btn>
          <q-btn flat round dense color="primary" icon="edit" @click="openEdit(props.row)" />
          <q-btn flat round dense color="negative" icon="delete" @click="remove(props.row.id)" v-if="props.row.active" />
        </q-td>
      </template>
    </SharedCrudTable>

    <!-- Modal del Kardex -->
    <SharedKardexDialog 
      v-model="isKardexOpen" 
      :product="selectedProduct" 
      :central-stock="selectedProduct ? getCentralStock(selectedProduct) : 0" 
    />

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

      <div class="row q-mt-sm">
        <div class="col-12">
          <q-input v-model.number="form.referencePrice" type="number" step="0.01" label="Costo Referencial (Reportes)" hint="Precio base unitario para calcular el valor del inventario" outlined dense>
            <template v-slot:prepend><q-icon name="attach_money" /></template>
          </q-input>
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
import { useWarehousesStore } from '~/stores/warehouses'
import { useProductForm } from '~/composables/features/useProductForm'

const store = useProductsStore()
const categoriesStore = useCategoriesStore()
const unitsStore = useUnitsStore()
const warehousesStore = useWarehousesStore()

const { isDialogOpen, isEditing, form, openCreate, openEdit, submit, remove } = useProductForm()

const filter = ref('')
const isKardexOpen = ref(false)
const selectedProduct = ref<any>(null)

// Funciones para calcular Stock
const getCentralStock = (product: any) => {
  const central = warehousesStore.warehouses.find(w => w.type === 'CENTRAL')
  if (!central || !product.stocks) return 0
  const stock = product.stocks.find((s: any) => s.warehouseId === central.id)
  return stock ? Number(stock.quantity) : 0
}

const getLocalStock = (product: any) => {
  const locals = warehousesStore.warehouses.filter(w => w.type === 'LOCAL')
  if (locals.length === 0 || !product.stocks) return 0
  
  let total = 0
  for (const local of locals) {
    const stock = product.stocks.find((s: any) => s.warehouseId === local.id)
    if (stock) total += Number(stock.quantity)
  }
  return total
}

const openKardex = (product: any) => {
  selectedProduct.value = product
  isKardexOpen.value = true
}


const columns = [
  { name: 'code', label: 'Código', field: 'code', align: 'left' as const, sortable: true },
  { name: 'name', label: 'Nombre', field: 'name', align: 'left' as const, sortable: true },
  { name: 'category', label: 'Categoría', align: 'center' as const },
  { name: 'centralStock', label: 'Stock Central', align: 'center' as const, sortable: true, field: (row:any) => getCentralStock(row) },
  { name: 'localStock', label: 'Stock Locales (Cocinas)', align: 'center' as const },
  { name: 'unit', label: 'Und', align: 'center' as const },
  { name: 'minimumStock', label: 'Min', field: 'minimumStock', align: 'center' as const },
  { name: 'referencePrice', label: 'Costo Ref.', field: 'referencePrice', align: 'center' as const, format: (val: any) => `$${Number(val).toFixed(2)}` },
  { name: 'perishable', label: 'Perecedero', align: 'center' as const },
  { name: 'status', label: 'Estado', field: 'active', align: 'center' as const, sortable: true },
  { name: 'actions', label: 'Acciones', align: 'right' as const }
]

onMounted(async () => {
  store.fetchAll()
  if (categoriesStore.categories.length === 0) categoriesStore.fetchAll()
  if (unitsStore.units.length === 0) unitsStore.fetchAll()
  if (warehousesStore.warehouses.length === 0) await warehousesStore.fetchAll()
})
</script>
