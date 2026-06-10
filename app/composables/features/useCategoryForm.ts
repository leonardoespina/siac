import { ref } from 'vue'
import { useQuasar } from 'quasar'
import { useCategoriesStore, type Category } from '../../stores/categories'

/**
 * Composable que encapsula toda la lógica visual y de negocio 
 * para el formulario de Categorías.
 * Mantiene limpia la vista (Vue component) de lógicas de guardado y notificaciones.
 */
export function useCategoryForm() {
  const $q = useQuasar()
  const store = useCategoriesStore()

  const isDialogOpen = ref(false)
  const isEditing = ref(false)
  const form = ref<Partial<Category>>({
    name: '',
    description: '',
    active: true
  })

  /**
   * Abre el modal de creación en blanco.
   */
  const openCreate = () => {
    isEditing.value = false
    form.value = { name: '', description: '', active: true }
    isDialogOpen.value = true
  }

  /**
   * Abre el modal pre-cargado con la categoría a editar.
   */
  const openEdit = (category: Category) => {
    isEditing.value = true
    form.value = { ...category }
    isDialogOpen.value = true
  }

  /**
   * Envía el formulario al Store. Captura errores y muestra notificaciones (Toasts).
   */
  const submit = async () => {
    try {
      if (isEditing.value && form.value.id) {
        await store.update(form.value.id, form.value)
        $q.notify({ type: 'positive', message: 'Categoría actualizada exitosamente' })
      } else {
        await store.create(form.value)
        $q.notify({ type: 'positive', message: 'Categoría creada exitosamente' })
      }
      isDialogOpen.value = false
    } catch (error: any) {
      $q.notify({ 
        type: 'negative', 
        message: error.data?.message || 'Error al guardar la categoría' 
      })
    }
  }

  /**
   * Solicita confirmación antes de desactivar lógicamente la categoría.
   */
  const remove = async (id: number) => {
    $q.dialog({
      title: 'Confirmar',
      message: '¿Estás seguro de que deseas eliminar esta categoría?',
      cancel: true,
      persistent: true
    }).onOk(async () => {
      try {
        await store.remove(id)
        $q.notify({ type: 'positive', message: 'Categoría eliminada exitosamente' })
      } catch (error: any) {
        $q.notify({ type: 'negative', message: error.data?.message || 'Error al eliminar' })
      }
    })
  }

  return {
    isDialogOpen,
    isEditing,
    form,
    openCreate,
    openEdit,
    submit,
    remove
  }
}
