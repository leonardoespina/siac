<template>
  <q-table
    :title="title"
    :rows="rows"
    :columns="columns"
    :loading="loading"
    :filter="filter"
    v-model:pagination="internalPagination"
    @request="onRequest"
    row-key="id"
    flat
    bordered
    class="my-sticky-header-table"
  >
    <!-- Personalización de la barra superior -->
    <template v-slot:top-right>
      <q-input 
        borderless 
        dense 
        debounce="300" 
        v-model="internalFilter" 
        placeholder="Buscar..."
        class="q-mr-md bg-grey-2 q-px-sm rounded-borders"
      >
        <template v-slot:append>
          <q-icon name="search" />
        </template>
      </q-input>

      <q-btn 
        v-if="showAdd"
        color="primary" 
        icon="add" 
        :label="addLabel" 
        unelevated
        @click="$emit('add')" 
      />
    </template>

    <!-- Permitir que el componente padre inyecte sus propios slots (Ej. celdas personalizadas o de acciones) -->
    <template v-for="(_, slot) in $slots" v-slot:[slot]="scope">
      <slot :name="slot" v-bind="scope" />
    </template>
  </q-table>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps({
  title: { type: String, default: '' },
  rows: { type: Array, required: true },
  columns: { type: Array, required: true },
  loading: { type: Boolean, default: false },
  filter: { type: String, default: '' },
  showAdd: { type: Boolean, default: true },
  addLabel: { type: String, default: 'Nuevo' },
  pagination: { type: Object, default: () => ({ rowsPerPage: 10 }) }
})

const emit = defineEmits(['update:filter', 'update:pagination', 'request', 'add'])

const internalFilter = computed({
  get: () => props.filter,
  set: (val) => emit('update:filter', val)
})

const internalPagination = computed({
  get: () => props.pagination,
  set: (val) => emit('update:pagination', val)
})

const onRequest = (reqProps: any) => {
  emit('request', reqProps)
}
</script>
