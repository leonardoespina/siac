<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useSquadsStore } from '~/stores/squads'
import { useDinersStore } from '~/stores/diners'

const squadsStore = useSquadsStore()
const dinersStore = useDinersStore()

// Agrupamos los comensales de la subdependencia por Cuadrilla
const workersBySquad = computed(() => {
  const grouped: Record<number, any[]> = {}
  
  // Inicializamos todos los squads globales
  squadsStore.squads.forEach(sq => {
    grouped[sq.id] = []
  })

  // Agrupamos
  dinersStore.diners.forEach(diner => {
    if (!grouped[diner.squadId]) grouped[diner.squadId] = []
    grouped[diner.squadId].push(diner)
  })

  return squadsStore.squads.map(sq => ({
    ...sq,
    workers: grouped[sq.id] || []
  })).filter(sq => sq.workers.length > 0) // Mostrar solo cuadrillas que tengan personal asignado en nuestra área
})

onMounted(() => {
  squadsStore.fetchAll()
  dinersStore.fetchAll()
})
</script>

<template>
  <q-page class="q-pa-lg">
    <div class="row q-col-gutter-md">
      <div class="col-12">
        <q-card flat bordered>
          <q-card-section class="row items-center q-pb-none">
            <div class="text-h6">Personal Asignado por Cuadrilla</div>
            <q-space />
            <q-btn color="primary" to="/diners/workers" label="Asignar Personal" icon="person_add" />
          </q-card-section>
          
          <q-card-section>
            <div v-if="workersBySquad.length === 0" class="text-grey text-center q-pa-lg">
              Aún no tienes trabajadores asignados a ninguna cuadrilla.
              Ve a "Comensales Físicos" para registrarlos y asignarlos.
            </div>

            <q-list v-else bordered class="rounded-borders">
              <q-expansion-item
                v-for="squad in workersBySquad"
                :key="squad.id"
                expand-separator
                icon="engineering"
                :label="squad.name"
                :caption="`${squad.workers.length} trabajadores asignados`"
                header-class="text-weight-bold"
              >
                <q-card>
                  <q-card-section>
                    <q-list dense>
                      <q-item v-for="worker in squad.workers" :key="worker.id">
                        <q-item-section avatar>
                          <q-icon name="person" color="grey" />
                        </q-item-section>
                        <q-item-section>
                          <q-item-label>{{ worker.name }}</q-item-label>
                          <q-item-label caption>CI: {{ worker.cedula }} - Dieta: {{ worker.rationType }}</q-item-label>
                        </q-item-section>
                      </q-item>
                    </q-list>
                  </q-card-section>
                </q-card>
              </q-expansion-item>
            </q-list>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>
