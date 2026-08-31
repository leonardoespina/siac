<template>
  <q-input
    :model-value="modelValue"
    @update:model-value="onInput"
    :label="label"
    :outlined="outlined"
    :dense="dense"
    :bg-color="bgColor"
    :clearable="clearable"
    mask="####-##-##"
    placeholder="AAAA-MM-DD"
  >
    <template v-slot:append>
      <q-icon name="event" class="cursor-pointer">
        <q-popup-proxy cover transition-show="scale" transition-hide="scale">
          <q-date
            :model-value="normalizedDate"
            @update:model-value="onDateSelect"
            mask="YYYY-MM-DD"
            today-btn
          >
            <div class="row items-center justify-end">
              <q-btn v-close-popup label="Listo" color="primary" flat />
            </div>
          </q-date>
        </q-popup-proxy>
      </q-icon>
    </template>
  </q-input>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  modelValue?: string | null
  label?: string
  outlined?: boolean
  dense?: boolean
  bgColor?: string
  clearable?: boolean
}>(), {
  outlined: true,
  dense: true,
  bgColor: 'white',
  clearable: false
})

const emit = defineEmits<{
  (e: 'update:modelValue', val: string): void
}>()

// Normalizar fecha para q-date (convierte posibles / a -)
const normalizedDate = computed(() => {
  if (!props.modelValue) return ''
  return props.modelValue.replace(/\//g, '-')
})

const onInput = (val: string | number | null) => {
  if (!val) {
    emit('update:modelValue', '')
    return
  }
  const str = String(val).replace(/\//g, '-')
  emit('update:modelValue', str)
}

const onDateSelect = (val: string) => {
  if (!val) {
    emit('update:modelValue', '')
    return
  }
  const str = val.replace(/\//g, '-')
  emit('update:modelValue', str)
}
</script>
