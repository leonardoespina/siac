import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useDiningRoomsStore = defineStore('diningRooms', () => {
  const diningRooms = ref<any[]>([])
  const isLoading = ref(false)
  const isFetched = ref(false)

  const fetchAll = async () => {
    if (isFetched.value) return
    isLoading.value = true
    try {
      const data = await $fetch('/api/dining-rooms')
      diningRooms.value = data
      isFetched.value = true
    } catch (error) {
      console.error('Error fetching dining rooms', error)
    } finally {
      isLoading.value = false
    }
  }

  return {
    diningRooms,
    isLoading,
    fetchAll
  }
})
