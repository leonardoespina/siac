<template>
  <q-dialog v-model="isOpen" persistent>
    <q-card style="min-width: 350px" class="text-center q-pa-md">
      <q-card-section>
        <div class="text-h6">Registro Biométrico</div>
        <div class="text-subtitle2 text-grey-7">{{ dinerName }}</div>
      </q-card-section>

      <q-card-section class="q-py-xl">
        <!-- Mostrar spinner mientras escanea, o icono estático cuando no -->
        <q-spinner-puff
          v-if="isScanning"
          color="primary"
          size="100px"
        />
        <q-icon
          v-else
          name="fingerprint"
          :color="statusColor"
          size="100px"
        />
        <div class="text-h6 q-mt-md" :class="`text-${statusColor}`">
          {{ statusText }}
        </div>
        <div v-if="errorMessage" class="text-negative q-mt-sm">
          {{ errorMessage }}
        </div>
      </q-card-section>

      <q-card-actions align="center" class="q-gutter-md">
        <q-btn
          flat
          label="Cancelar"
          color="grey"
          v-close-popup
          :disable="isScanning || isSaving"
          @click="resetState"
        />
        <q-btn
          v-if="!isSuccess"
          color="primary"
          :label="isScanning ? 'Escaneando...' : 'Iniciar Escaneo'"
          :loading="isScanning"
          :disable="isSaving"
          @click="startScan"
        />
        <q-btn
          v-if="isSuccess"
          color="positive"
          label="Guardar Huella"
          :loading="isSaving"
          @click="saveFingerprint"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'
import { useBiometricScanner } from '~/composables/features/useBiometricScanner'
import { useDinersStore } from '~/stores/diners'

const props = defineProps<{
  modelValue: boolean
  dinerId: number | null
  dinerName: string
}>()

const emit = defineEmits(['update:modelValue', 'saved'])

const $q = useQuasar()
const dinersStore = useDinersStore()
const { isScanning, isSuccess, isError, errorMessage, scanFingerprint, reset } = useBiometricScanner()

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const isSaving = ref(false)
const currentHash = ref('')

const statusColor = computed(() => {
  if (isScanning.value) return 'primary'
  if (isSuccess.value) return 'positive'
  if (isError.value) return 'negative'
  return 'grey-5'
})

const statusText = computed(() => {
  if (isScanning.value) return 'Coloque el dedo en el lector...'
  if (isSuccess.value) return '¡Huella capturada con éxito!'
  if (isError.value) return 'Error en la lectura'
  return 'Esperando inicio...'
})

const resetState = () => {
  currentHash.value = ''
  reset()
}

const startScan = async () => {
  currentHash.value = ''
  try {
    const hash = await scanFingerprint()
    currentHash.value = hash
  } catch (error) {
    // El error ya es manejado por el composable y se muestra en la UI
  }
}

const saveFingerprint = async () => {
  if (!props.dinerId || !currentHash.value) return
  
  isSaving.value = true
  try {
    await $fetch(`/api/diners/${props.dinerId}/biometric`, {
      method: 'PUT',
      body: { fingerprint: currentHash.value }
    })
    $q.notify({ type: 'positive', message: 'Huella registrada exitosamente' })
    
    // Actualizar en el store local para que la tabla refleje que ya tiene huella
    const index = dinersStore.diners.findIndex(d => d.id === props.dinerId)
    if (index !== -1) dinersStore.diners[index].fingerprint = currentHash.value
    
    emit('saved')
    isOpen.value = false
    resetState()
  } catch (error: any) {
    $q.notify({ type: 'negative', message: error.data?.message || 'Error al guardar la huella' })
  } finally {
    isSaving.value = false
  }
}
</script>
