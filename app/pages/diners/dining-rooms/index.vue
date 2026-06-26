<template>
  <q-page padding>
    <div class="text-h4 text-weight-bold q-mb-md text-primary">Gestión de Comedores</div>

    <SharedCrudTable
      title="Comedores"
      :columns="columns"
      :rows="store.diningRooms"
      :filter="filter"
      :loading="store.isLoading"
      @update:filter="filter = $event"
      @add="openCreate"
    >
      <template v-slot:body-cell-warehouse="props">
        <q-td :props="props">
          <span v-if="props.row.warehouse" class="text-weight-medium">
            <q-icon name="warehouse" color="teal" size="xs" class="q-mr-xs" />
            {{ props.row.warehouse.name }}
          </span>
          <span v-else class="text-grey-6 text-italic">Ninguno</span>
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
      :title="isEditing ? 'Editar Comedor' : 'Nuevo Comedor'"
      @save="submit"
    >
      <q-input
        v-model="form.name"
        label="Nombre del Comedor *"
        outlined
        dense
        autofocus
        :rules="[val => !!val || 'El nombre es requerido']"
      />
      
      <q-select
        v-model="form.warehouseId"
        :options="warehouseOptions"
        label="Almacén Proveedor (Opcional)"
        option-value="id"
        option-label="name"
        emit-value
        map-options
        clearable
        outlined
        dense
        class="q-mt-md"
        hint="Almacén físico del cual este comedor extraerá sus insumos"
      />
      
      <q-toggle
        v-if="isEditing"
        v-model="form.active"
        label="Comedor Activo"
        class="q-mt-md"
      />
    </SharedFormDialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useDiningRoomsStore } from '~/stores/diningRooms'
import { useWarehousesStore } from '~/stores/warehouses'
import { useDiningRoomForm } from '~/composables/features/useDiningRoomForm'

const store = useDiningRoomsStore()
const warehousesStore = useWarehousesStore()

const { isDialogOpen, isEditing, form, openCreate, openEdit, submit, remove } = useDiningRoomForm()

const filter = ref('')

const warehouseOptions = computed(() => warehousesStore.warehouses.filter(w => w.active))

const columns = [
  { name: 'name', label: 'Nombre del Comedor', field: 'name', align: 'left' as const, sortable: true },
  { name: 'warehouse', label: 'Almacén Proveedor', field: 'warehouseId', align: 'left' as const, sortable: true },
  { name: 'status', label: 'Estado', field: 'active', align: 'center' as const, sortable: true },
  { name: 'actions', label: 'Acciones', align: 'right' as const }
]

onMounted(() => {
  store.fetchAll()
  warehousesStore.fetchAll()
})
</script>
