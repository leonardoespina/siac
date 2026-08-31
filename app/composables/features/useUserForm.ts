import { ref } from 'vue'
import { useUsersStore } from '~/stores/users'
import { useNotifications } from '~/composables/core/useNotifications'

export function useUserForm() {
  const store = useUsersStore()
  const { notify } = useNotifications()
  
  const isOpen = ref(false)
  const isEditing = ref(false)
  const loading = ref(false)
  
  const form = ref({
    id: 0,
    cedula: '',
    name: '',
    password: '',
    roleId: null as number | null,
    warehouseId: null as number | null,
    active: true
  })

  function openCreate() {
    isEditing.value = false
    form.value = { id: 0, cedula: '', name: '', password: '', roleId: null, warehouseId: null, active: true }
    isOpen.value = true
  }

  function openEdit(user: any) {
    isEditing.value = true
    form.value = { ...user, password: '' }
    isOpen.value = true
  }

  async function submit() {
    loading.value = true
    try {
      if (isEditing.value) {
        await store.updateUser(form.value.id, form.value)
        notify.success('Usuario actualizado correctamente')
      } else {
        await store.createUser(form.value)
        notify.success('Usuario creado. Su contraseña por defecto es: 123456')
      }
      isOpen.value = false
    } catch (error: any) {
      notify.error(error.data?.message || 'Error al guardar el usuario')
    } finally {
      loading.value = false
    }
  }

  return { isOpen, isEditing, loading, form, openCreate, openEdit, submit }
}
