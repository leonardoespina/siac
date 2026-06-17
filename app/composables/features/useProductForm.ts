import { ref } from 'vue'
import { useQuasar } from 'quasar'
import { useProductsStore, type Product } from '../../stores/products'

/**
 * Composable complejo que orquesta la creación y edición del Catálogo de Productos.
 * Desvincula por completo la lógica pesada del archivo .vue.
 */
export function useProductForm() {
  const $q = useQuasar()
  const store = useProductsStore()

  const isDialogOpen = ref(false)
  const isEditing = ref(false)
  
  // Estado inicial del producto
  const form = ref<Partial<Product>>({
    code: '',
    name: '',
    description: '',
    categoryId: undefined,
    unitId: undefined,
    minimumStock: 0,
    maximumStock: undefined,
    referencePrice: 0,
    isPerishable: false,
    active: true
  })

  const openCreate = () => {
    isEditing.value = false
    form.value = {
      code: '',
      name: '',
      description: '',
      categoryId: undefined,
      unitId: undefined,
      minimumStock: 0,
      maximumStock: undefined,
      referencePrice: 0,
      isPerishable: false,
      active: true
    }
    isDialogOpen.value = true
  }

  const openEdit = (product: Product) => {
    isEditing.value = true
    form.value = { ...product }
    isDialogOpen.value = true
  }

  const submit = async () => {
    try {
      if (isEditing.value && form.value.id) {
        await store.update(form.value.id, form.value)
        $q.notify({ type: 'positive', message: 'Producto actualizado exitosamente' })
      } else {
        await store.create(form.value)
        $q.notify({ type: 'positive', message: 'Producto registrado en el catálogo' })
      }
      isDialogOpen.value = false
    } catch (error: any) {
      $q.notify({ type: 'negative', message: error.data?.message || 'Error al guardar producto' })
    }
  }

  const remove = async (id: number) => {
    $q.dialog({
      title: '¡Atención!',
      message: '¿Realmente deseas desactivar este producto del catálogo maestro?',
      cancel: true,
      ok: { color: 'negative', label: 'Desactivar' }
    }).onOk(async () => {
      try {
        await store.remove(id)
        $q.notify({ type: 'positive', message: 'Producto retirado' })
      } catch (error: any) {
        $q.notify({ type: 'negative', message: 'Error al desactivar el producto' })
      }
    })
  }

  return { isDialogOpen, isEditing, form, openCreate, openEdit, submit, remove }
}
