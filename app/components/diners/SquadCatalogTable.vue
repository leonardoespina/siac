<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSquadsStore } from '~/stores/squads'
import { useAuthStore } from '~/stores/auth'
import CrudTable from '~/components/shared/CrudTable.vue'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const squadsStore = useSquadsStore()
const auth = useAuthStore()

// Modal para Cuadrilla Global
const showSquadDialog = ref(false)
const isEditingSquad = ref(false)
const squadId = ref<number | null>(null)
const squadName = ref('')

const openCreateSquad = () => {
  isEditingSquad.value = false
  squadId.value = null
  squadName.value = ''
  showSquadDialog.value = true
}

const openEditSquad = (squad: any) => {
  isEditingSquad.value = true
  squadId.value = squad.id
  squadName.value = squad.name
  showSquadDialog.value = true
}

const submitSquad = async () => {
  if (!squadName.value) return
  try {
    if (isEditingSquad.value && squadId.value) {
      await squadsStore.updateSquad(squadId.value, squadName.value)
      $q.notify({ type: 'positive', message: 'Cuadrilla actualizada exitosamente' })
    } else {
      await squadsStore.createSquad(squadName.value)
      $q.notify({ type: 'positive', message: 'Cuadrilla creada exitosamente' })
    }
    showSquadDialog.value = false
  } catch (error: any) {
    $q.notify({ type: 'negative', message: error.data?.message || 'Error al guardar la cuadrilla' })
  }
}

const confirmDeleteSquad = (id: number, name: string) => {
  $q.dialog({
    title: 'Confirmar Eliminación',
    message: `¿Está seguro de desactivar la cuadrilla "${name}" del catálogo global?`,
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      await squadsStore.deleteSquad(id)
      $q.notify({ type: 'positive', message: 'Cuadrilla desactivada' })
    } catch (error: any) {
      $q.notify({ type: 'negative', message: error.data?.message || 'Error al eliminar' })
    }
  })
}

onMounted(() => {
  squadsStore.fetchAll()
})
</script>

<template>
  <div>
    <CrudTable
      title="Catálogo Base de Cuadrillas"
      :rows="squadsStore.squads"
      :columns="[
        { name: 'name', label: 'Nombre de la Cuadrilla', field: 'name', align: 'left', sortable: true },
        { name: 'actions', label: 'Acciones', align: 'right' }
      ]"
      :loading="squadsStore.isLoading"
      :showAdd="auth.hasPermission('SQUADS', 'canCreate')"
      addLabel="Nueva Cuadrilla"
      @add="openCreateSquad"
    >
      <template v-slot:body-cell-actions="props">
        <q-td :props="props">
          <q-btn v-if="auth.hasPermission('SQUADS', 'canUpdate')" flat round icon="edit" color="primary" size="sm" @click="openEditSquad(props.row)">
            <q-tooltip>Editar Cuadrilla</q-tooltip>
          </q-btn>
          <q-btn v-if="auth.hasPermission('SQUADS', 'canDelete')" flat round icon="delete" color="negative" size="sm" @click="confirmDeleteSquad(props.row.id, props.row.name)">
            <q-tooltip>Desactivar Cuadrilla</q-tooltip>
          </q-btn>
        </q-td>
      </template>
    </CrudTable>

    <!-- Modal Cuadrilla Global -->
    <q-dialog v-model="showSquadDialog" persistent>
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">{{ isEditingSquad ? 'Editar' : 'Crear' }} Cuadrilla Global</div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <q-input v-model="squadName" label="Nombre de la cuadrilla" outlined dense autofocus @keyup.enter="submitSquad" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" color="grey" v-close-popup />
          <q-btn flat label="Guardar" color="primary" @click="submitSquad" :loading="squadsStore.isLoading" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>
