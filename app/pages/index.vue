<script setup lang="ts">
import { onMounted, computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '~/stores/auth'
import { useDashboardStore } from '~/stores/dashboard'
import { useProductsStore } from '~/stores/products'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const router = useRouter()

const auth = useAuthStore()
const dashboardStore = useDashboardStore()
const productStore = useProductsStore()

// Rol derivado
const isAdmin = computed(() => {
  const roleName = auth.user?.role?.name?.toUpperCase()
  return roleName === 'ADMIN' || roleName === 'ADMINISTRADOR'
})

const isOperator = computed(() => {
  return !isAdmin.value
})

const warehouseName = computed(() => {
  // En el futuro, podríamos cruzar auth.user.warehouseId con el nombre real
  return 'Sede Local' 
})

// ── LÓGICA DEL OPERADOR LOCAL ──
const isShiftOpen = computed(() => !!dashboardStore.activeShift)

// Obtener el inventario local filtrando por el warehouseId del usuario
const localInventory = computed(() => {
  if (!auth.user?.warehouseId) return []
  
  return productStore.products.map(p => {
    // Buscamos el stock de este producto en el almacén del usuario
    const stockObj = p.stocks?.find((s: any) => s.warehouseId === auth.user?.warehouseId)
    const quantity = stockObj ? Number(stockObj.quantity) : 0
    return {
      ...p,
      localQuantity: quantity
    }
  }).filter(p => p.localQuantity > 0) // Solo mostrar los que tienen stock local
})

const handleOpenShift = () => {
  $q.dialog({
    title: 'Abrir Turno',
    message: '¿Estás seguro de iniciar el turno de operaciones?',
    options: {
      type: 'radio',
      model: 'DIURNO',
      items: [
        { label: 'Turno Diurno', value: 'DIURNO' },
        { label: 'Turno Nocturno', value: 'NOCTURNO' }
      ]
    },
    cancel: true,
    persistent: true
  }).onOk(async (shiftType) => {
    try {
      await dashboardStore.openShift(shiftType)
      $q.notify({ type: 'positive', message: `Turno ${shiftType} abierto con éxito.` })
    } catch (error: any) {
      $q.notify({ type: 'negative', message: error.data?.message || 'Error al abrir turno' })
    }
  })
}

const goTo = (route: string) => {
  if (isOperator.value && !isShiftOpen.value && route.includes('new')) {
    $q.notify({ type: 'warning', message: 'Debes abrir el turno primero para registrar movimientos.' })
    return
  }
  router.push(route)
}

onMounted(async () => {
  if (isAdmin.value) {
    await dashboardStore.fetchPendingTasks()
  } else {
    // Es operador
    await Promise.all([
      dashboardStore.fetchActiveShift(),
      productStore.fetchAll() // Fetch productos (para ver stock local)
    ])
  }
})
</script>

<template>
  <q-page class="q-pa-lg bg-grey-1">
    
    <!-- HEADER GENERAL -->
    <div class="q-mb-xl">
      <div class="text-h4 text-weight-bold text-primary">
        Hola, {{ auth.user?.name || 'Usuario' }}
      </div>
      <div class="text-subtitle1 text-grey-7">
        <template v-if="isAdmin">Bienvenido a tu centro de control.</template>
        <template v-else>Sede Operativa: <span class="text-weight-bold text-primary">{{ warehouseName }}</span></template>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- VISTA GERENCIAL (ADMIN)                    -->
    <!-- ========================================== -->
    <div v-if="isAdmin" class="row q-col-gutter-lg">
      
      <!-- Bandeja de Aprobaciones -->
      <div class="col-12 col-md-8">
        <q-card flat bordered class="my-card">
          <q-card-section class="bg-orange-1 row items-center">
            <q-icon name="inbox" color="orange-8" size="sm" class="q-mr-sm" />
            <div class="text-h6 text-orange-9 text-weight-bold">Bandeja de Aprobaciones Pendientes</div>
            <q-space />
            <q-badge color="orange-6" class="text-weight-bold q-pa-sm" :label="dashboardStore.pendingTasks.length + ' Tareas'" />
          </q-card-section>
          
          <q-list separator>
            <template v-if="dashboardStore.pendingTasks.length > 0">
              <q-item v-for="task in dashboardStore.pendingTasks" :key="task.id" clickable v-ripple @click="goTo(task.route)">
                <q-item-section avatar>
                  <q-icon :name="task.icon" :color="task.color" />
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-bold">{{ task.type }}</q-item-label>
                  <q-item-label caption>{{ task.description }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-item-label caption>Por: {{ task.user }}</q-item-label>
                  <q-btn flat dense color="primary" label="Revisar" />
                </q-item-section>
              </q-item>
            </template>
            <template v-else>
              <div class="q-pa-lg text-center text-grey-6">
                <q-icon name="check_circle_outline" size="xl" color="positive" class="q-mb-md" />
                <div class="text-subtitle1">Todo está al día. No hay aprobaciones pendientes.</div>
              </div>
            </template>
          </q-list>
        </q-card>
      </div>

      <!-- Atajos Rápidos -->
      <div class="col-12 col-md-4">
        <div class="row q-col-gutter-md">
          
          <div class="col-12">
            <q-card flat bordered class="cursor-pointer bg-primary text-white hover-up" @click="goTo('/reports')">
              <q-card-section class="row items-center">
                <q-icon name="analytics" size="xl" class="q-mr-md opacity-80" />
                <div>
                  <div class="text-h6 text-weight-bold">Dashboard de Reportes</div>
                  <div class="text-subtitle2 text-blue-2">Ver gráficas y valores monetarios</div>
                </div>
                <q-space />
                <q-icon name="arrow_forward" size="sm" />
              </q-card-section>
            </q-card>
          </div>

          <div class="col-12">
            <q-card flat bordered class="cursor-pointer hover-up" @click="goTo('/inventory/transfers/new')">
              <q-card-section class="row items-center">
                <q-avatar color="blue-1" text-color="blue-7" icon="sync_alt" class="q-mr-md" />
                <div>
                  <div class="text-subtitle1 text-weight-bold">Crear Transferencia</div>
                  <div class="text-caption text-grey-6">Mover stock entre sedes</div>
                </div>
              </q-card-section>
            </q-card>
          </div>

          <div class="col-12">
            <q-card flat bordered class="cursor-pointer hover-up" @click="goTo('/inventory/products')">
              <q-card-section class="row items-center">
                <q-avatar color="green-1" text-color="green-7" icon="inventory_2" class="q-mr-md" />
                <div>
                  <div class="text-subtitle1 text-weight-bold">Catálogo de Productos</div>
                  <div class="text-caption text-grey-6">Actualizar productos y precios</div>
                </div>
              </q-card-section>
            </q-card>
          </div>

        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- VISTA OPERATIVA (OPERADOR LOCAL)           -->
    <!-- ========================================== -->
    <div v-else class="row q-col-gutter-lg">
      
      <!-- Control de Turno Gigante -->
      <div class="col-12">
        <q-card flat bordered :class="isShiftOpen ? 'bg-green-1 border-green' : 'bg-red-50 border-red'">
          <q-card-section class="row items-center q-pa-lg">
            <q-icon 
              :name="isShiftOpen ? 'lock_open' : 'lock_clock'" 
              :color="isShiftOpen ? 'positive' : 'negative'" 
              size="xl" 
              class="q-mr-lg" 
            />
            <div>
              <div class="text-h5 text-weight-bold" :class="isShiftOpen ? 'text-green-9' : 'text-red-9'">
                {{ isShiftOpen ? `Turno ${dashboardStore.activeShift?.shiftType} Abierto` : 'Tu turno está cerrado' }}
              </div>
              <div :class="isShiftOpen ? 'text-green-7' : 'text-red-7'">
                {{ isShiftOpen ? 'Puedes registrar movimientos operativos con normalidad.' : 'No puedes registrar movimientos hasta que abras el turno del día.' }}
              </div>
            </div>
            <q-space />
            <q-btn 
              v-if="!isShiftOpen"
              color="negative" 
              icon="play_circle" 
              label="ABRIR TURNO" 
              size="lg" 
              class="text-weight-bold"
              @click="handleOpenShift"
            />
          </q-card-section>
        </q-card>
      </div>

      <!-- Acciones de Piso -->
      <div class="col-12 col-md-6">
        <q-card flat bordered class="h-full">
          <q-card-section>
            <div class="text-h6 text-weight-bold q-mb-md">Operaciones Rápidas</div>
            
            <q-btn 
              outline
              color="primary" 
              class="full-width q-mb-md q-pa-md justify-start no-wrap shadow-1"
              @click="goTo('/inventory/transfers')"
            >
              <q-avatar color="primary" text-color="white" icon="local_shipping" class="q-mr-md" size="sm" />
              <div class="text-left">
                <div class="text-subtitle1 text-weight-bold">Historial de Entradas</div>
                <div class="text-caption text-grey-7 text-none">Mercancía enviada por la Sede Central</div>
              </div>
            </q-btn>

            <q-btn 
              outline
              :color="isShiftOpen ? 'orange-8' : 'grey-5'" 
              :disable="!isShiftOpen"
              class="full-width q-pa-md justify-start no-wrap shadow-1"
              @click="goTo('/reports/consumptions')"
            >
              <q-avatar :color="isShiftOpen ? 'orange-8' : 'grey-5'" text-color="white" icon="restaurant" class="q-mr-md" size="sm" />
              <div class="text-left">
                <div class="text-subtitle1 text-weight-bold">Despachar a Cocina</div>
                <div class="text-caption text-grey-7 text-none">
                  {{ isShiftOpen ? 'Registrar consumo interno' : 'Debes abrir turno primero' }}
                </div>
              </div>
            </q-btn>
          </q-card-section>
        </q-card>
      </div>

      <!-- Mi Stock Actual -->
      <div class="col-12 col-md-6">
        <q-card flat bordered class="h-full">
          <q-card-section class="bg-grey-2 row items-center q-pb-md">
            <div class="text-h6 text-weight-bold">Mi Stock Actual</div>
            <q-space />
            <q-btn flat dense color="primary" label="Ver catálogo completo" @click="goTo('/inventory/products')" />
          </q-card-section>
          
          <q-list separator class="q-mt-sm">
            <template v-if="localInventory.length > 0">
              <q-item v-for="prod in localInventory" :key="prod.id">
                <q-item-section>
                  <q-item-label class="text-weight-bold">{{ prod.name }}</q-item-label>
                  <q-item-label caption>{{ prod.category?.name || 'S/C' }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <div class="text-h6 text-weight-bold text-dark">
                    {{ prod.localQuantity }} <span class="text-caption text-grey-7">{{ prod.unit?.abbreviation }}</span>
                  </div>
                </q-item-section>
              </q-item>
            </template>
            <template v-else>
              <div class="q-pa-xl text-center text-grey-5">
                <q-icon name="inventory_2" size="xl" class="q-mb-md opacity-50" />
                <div class="text-subtitle1">Tu almacén está vacío. No hay stock disponible.</div>
              </div>
            </template>
          </q-list>
        </q-card>
      </div>

    </div>
  </q-page>
</template>

<style scoped>
.my-card {
  height: 100%;
}
.hover-up {
  transition: transform 0.2s;
}
.hover-up:hover {
  transform: translateY(-4px);
}
.border-red {
  border-left: 5px solid #f44336;
}
.border-green {
  border-left: 5px solid #4caf50;
}
.h-full {
  height: 100%;
}
</style>
