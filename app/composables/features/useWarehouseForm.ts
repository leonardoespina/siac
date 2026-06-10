import { ref } from 'vue'
import { useQuasar } from 'quasar'
import { useWarehousesStore, type Warehouse } from '../../stores/warehouses'

/**
 * Composable que administra la lógica de interfaz para los Almacenes.
 */
export function useWarehouseForm() {
  const $q = useQuasar()
  const store = useWarehousesStore()

  const isDialogOpen = ref(false)
  const isEditing = ref(false)
  const form = ref<Partial<Warehouse>>({
    name: '',
    type: 'LOCAL',
    location: '',
    active: true
  })

  const openCreate = () => {
    isEditing.value = false
    form.value = { name: '', type: 'LOCAL', location: '', active: true }
    isDialogOpen.value = true
  }

  const openEdit = (warehouse: Warehouse) => {
    isEditing.value = true
    form.value = { ...warehouse }
    isDialogOpen.value = true
  }

  const submit = async () => {
    try {
      if (isEditing.value && form.value.id) {
        await store.update(form.value.id, form.value)
        $q.notify({ type: 'positive', message: 'Almacén actualizado' })
      } else {
        await store.create(form.value)
        $q.notify({ type: 'positive', message: 'Almacén creado exitosamente' })
      }
      isDialogOpen.value = false
    } catch (error: any) {
      $q.notify({ type: 'negative', message: error.data?.message || 'Error al guardar el almacén' })
    }
  }

  const remove = async (id: number) => {
    $q.dialog({
      title: 'Confirmar',
      message: '¿Estás seguro de desactivar este almacén?',
      cancel: true
    }).onOk(async () => {
      try {
        await store.remove(id)
        $q.notify({ type: 'positive', message: 'Almacén desactivado' })
      } catch (error: any) {
        $q.notify({ type: 'negative', message: 'Error al desactivar' })
      }
    })
  }

  return { isDialogOpen, isEditing, form, openCreate, openEdit, submit, remove }
}
