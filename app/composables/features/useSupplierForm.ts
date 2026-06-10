import { ref } from 'vue'
import { useQuasar } from 'quasar'
import { useSuppliersStore, type Supplier } from '../../stores/suppliers'

export function useSupplierForm() {
  const $q = useQuasar()
  const store = useSuppliersStore()

  const isDialogOpen = ref(false)
  const isEditing = ref(false)
  const form = ref<Partial<Supplier>>({
    document: '',
    name: '',
    address: '',
    phone: '',
    email: '',
    active: true
  })

  const openCreate = () => {
    isEditing.value = false
    form.value = { document: '', name: '', address: '', phone: '', email: '', active: true }
    isDialogOpen.value = true
  }

  const openEdit = (supplier: Supplier) => {
    isEditing.value = true
    form.value = { ...supplier }
    isDialogOpen.value = true
  }

  const submit = async () => {
    try {
      if (isEditing.value && form.value.id) {
        await store.update(form.value.id, form.value)
        $q.notify({ type: 'positive', message: 'Proveedor actualizado' })
      } else {
        await store.create(form.value)
        $q.notify({ type: 'positive', message: 'Proveedor registrado exitosamente' })
      }
      isDialogOpen.value = false
    } catch (error: any) {
      $q.notify({ type: 'negative', message: error.data?.message || 'Error al guardar' })
    }
  }

  const remove = async (id: number) => {
    $q.dialog({
      title: 'Confirmar',
      message: '¿Desactivar este proveedor?',
      cancel: true
    }).onOk(async () => {
      try {
        await store.remove(id)
        $q.notify({ type: 'positive', message: 'Proveedor desactivado' })
      } catch (error: any) {
        $q.notify({ type: 'negative', message: 'Error al desactivar' })
      }
    })
  }

  return { isDialogOpen, isEditing, form, openCreate, openEdit, submit, remove }
}
