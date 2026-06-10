import { ref } from 'vue'
import { useQuasar } from 'quasar'
import { useUnitsStore, type Unit } from '../../stores/units'

/**
 * Composable que gestiona el estado y eventos del formulario de Unidades.
 * Sigue el patrón Hexagonal para desacoplar la UI de la lógica de red.
 */
export function useUnitForm() {
  const $q = useQuasar()
  const store = useUnitsStore()

  const isDialogOpen = ref(false)
  const isEditing = ref(false)
  const form = ref<Partial<Unit>>({
    name: '',
    abbreviation: '',
    active: true
  })

  const openCreate = () => {
    isEditing.value = false
    form.value = { name: '', abbreviation: '', active: true }
    isDialogOpen.value = true
  }

  const openEdit = (unit: Unit) => {
    isEditing.value = true
    form.value = { ...unit }
    isDialogOpen.value = true
  }

  const submit = async () => {
    try {
      if (isEditing.value && form.value.id) {
        await store.update(form.value.id, form.value)
        $q.notify({ type: 'positive', message: 'Unidad actualizada exitosamente' })
      } else {
        await store.create(form.value)
        $q.notify({ type: 'positive', message: 'Unidad creada exitosamente' })
      }
      isDialogOpen.value = false
    } catch (error: any) {
      $q.notify({ type: 'negative', message: error.data?.message || 'Error al guardar unidad' })
    }
  }

  const remove = async (id: number) => {
    $q.dialog({
      title: 'Confirmar eliminación',
      message: '¿Desactivar esta unidad permanentemente?',
      cancel: true
    }).onOk(async () => {
      try {
        await store.remove(id)
        $q.notify({ type: 'positive', message: 'Unidad eliminada' })
      } catch (error: any) {
        $q.notify({ type: 'negative', message: 'Error al eliminar' })
      }
    })
  }

  return { isDialogOpen, isEditing, form, openCreate, openEdit, submit, remove }
}
