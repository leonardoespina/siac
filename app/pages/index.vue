<script setup lang="ts">
import { useDashboard } from '~/composables/features/useDashboard'

const {
  auth,
  dashboardStore,
  canApprove,
  canOperateLocal,
  canManageDiners,
  canViewReports,
  canManageProducts,
  warehouseName,
  isShiftOpen,
  localInventory,
  handleOpenShift,
  goTo
} = useDashboard()
</script>

<template>
  <q-page :class="['bg-grey-1', $q.screen.lt.sm ? 'q-pa-sm' : 'q-pa-lg']">
    
    <!-- HEADER GENERAL -->
    <div class="q-mb-xl">
      <div class="text-h4 text-weight-bold text-primary">
        Hola, {{ auth.user?.name || 'Usuario' }}
      </div>
      <div class="text-subtitle1 text-grey-7">
        Bienvenido a tu panel de control personalizado.
      </div>
    </div>

    <!-- CONTENEDOR MODULAR -->
    <div class="row q-col-gutter-xl">

      <!-- ========================================== -->
      <!-- WIDGET: OPERACIÓN LOCAL (COCINA / ALMACÉN) -->
      <!-- ========================================== -->
      <div class="col-12" v-if="canOperateLocal">
        <div class="text-h6 text-weight-bold text-grey-8 q-mb-md">Gestión Operativa de Sede: {{ warehouseName }}</div>
        <div class="row q-col-gutter-lg">
          
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
                  :class="{ 'full-width q-mt-md': $q.screen.lt.sm }"
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
                  @click="goTo('/kitchen/operation')"
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
                <q-btn flat dense color="primary" label="Catálogo" @click="goTo('/inventory/products')" v-if="canManageProducts" />
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
                    <div class="text-subtitle1">Tu almacén está vacío.</div>
                  </div>
                </template>
              </q-list>
            </q-card>
          </div>

        </div>
      </div>

      <!-- ========================================== -->
      <!-- WIDGET: BANDEJA GERENCIAL Y APROBACIONES   -->
      <!-- ========================================== -->
      <div class="col-12" v-if="canApprove || canViewReports || canManageProducts">
        <div class="text-h6 text-weight-bold text-grey-8 q-mb-md">Gestión Administrativa e Inventarios</div>
        <div class="row q-col-gutter-lg">
          
          <!-- Bandeja de Aprobaciones -->
          <div class="col-12 col-md-8" v-if="canApprove">
            <q-card flat bordered class="h-full">
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

          <!-- Atajos Rápidos Gerenciales -->
          <div class="col-12" :class="canApprove ? 'col-md-4' : 'col-md-12'">
            <div class="row q-col-gutter-md">
              <div class="col-12" v-if="canViewReports">
                <q-card flat bordered class="cursor-pointer bg-primary text-white hover-up h-full" @click="goTo('/reports')">
                  <q-card-section class="row items-center">
                    <q-icon name="analytics" size="xl" class="q-mr-md opacity-80" />
                    <div>
                      <div class="text-h6 text-weight-bold">Dashboard de Reportes</div>
                      <div class="text-subtitle2 text-blue-2">Métricas globales y valores</div>
                    </div>
                  </q-card-section>
                </q-card>
              </div>

              <div class="col-12" v-if="canApprove">
                <q-card flat bordered class="cursor-pointer hover-up" @click="goTo('/inventory/transfers/new')">
                  <q-card-section class="row items-center">
                    <q-avatar color="blue-1" text-color="blue-7" icon="sync_alt" class="q-mr-md" />
                    <div>
                      <div class="text-subtitle1 text-weight-bold">Transferencias</div>
                      <div class="text-caption text-grey-6">Mover stock entre sedes</div>
                    </div>
                  </q-card-section>
                </q-card>
              </div>

              <div class="col-12" v-if="canManageProducts">
                <q-card flat bordered class="cursor-pointer hover-up" @click="goTo('/inventory/products')">
                  <q-card-section class="row items-center">
                    <q-avatar color="green-1" text-color="green-7" icon="inventory_2" class="q-mr-md" />
                    <div>
                      <div class="text-subtitle1 text-weight-bold">Catálogo Base</div>
                      <div class="text-caption text-grey-6">Productos, Categorías, Unidades</div>
                    </div>
                  </q-card-section>
                </q-card>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- ========================================== -->
      <!-- WIDGET: MÓDULO DE COMENSALES               -->
      <!-- ========================================== -->
      <div class="col-12" v-if="canManageDiners">
        <div class="text-h6 text-weight-bold text-grey-8 q-mb-md">Gestión de Comensales y Peticiones</div>
        <div class="row q-col-gutter-lg">
          
          <!-- Atajos de Comensales -->
          <div class="col-12 col-md-6">
            <div class="row q-col-gutter-md">
              <div class="col-12">
                <q-card flat bordered class="cursor-pointer bg-primary text-white hover-up" @click="goTo('/diners/workers')">
                  <q-card-section class="row items-center">
                    <q-icon name="fingerprint" size="xl" class="q-mr-md opacity-80" />
                    <div>
                      <div class="text-h6 text-weight-bold">Directorio de Comensales</div>
                      <div class="text-subtitle2 text-blue-2">Registrar o buscar trabajadores</div>
                    </div>
                    <q-space />
                    <q-icon name="arrow_forward" size="sm" />
                  </q-card-section>
                </q-card>
              </div>

              <div class="col-12 col-md-6">
                <q-card flat bordered class="cursor-pointer hover-up" @click="goTo('/diners/squads')">
                  <q-card-section class="row items-center">
                    <q-avatar color="blue-1" text-color="blue-7" icon="engineering" class="q-mr-md" />
                    <div>
                      <div class="text-subtitle1 text-weight-bold">Mis Cuadrillas</div>
                      <div class="text-caption text-grey-6">Ver grupos asignados</div>
                    </div>
                  </q-card-section>
                </q-card>
              </div>

              <div class="col-12 col-md-6">
                <q-card flat bordered class="cursor-pointer hover-up" @click="goTo('/diners/requests')">
                  <q-card-section class="row items-center">
                    <q-avatar color="green-1" text-color="green-7" icon="restaurant_menu" class="q-mr-md" />
                    <div>
                      <div class="text-subtitle1 text-weight-bold">Peticiones de Comida</div>
                      <div class="text-caption text-grey-6">Dieta extra y apoyo</div>
                    </div>
                  </q-card-section>
                </q-card>
              </div>
            </div>
          </div>
          
          <!-- Panel de Métricas de Comensales (Nuevo) -->
          <div class="col-12 col-md-6">
            <q-card flat bordered class="h-full bg-grey-2">
              <q-card-section class="q-pb-none">
                <div class="text-h6 text-weight-bold text-dark row items-center">
                  <q-icon name="analytics" class="q-mr-sm" color="primary" />
                  Métricas de mi Gerencia
                </div>
                <div class="text-caption text-grey-7">Resumen de trabajadores y actividad</div>
              </q-card-section>
              
              <q-card-section class="row q-col-gutter-sm text-center q-pt-md">
                <!-- Se podrían conectar estas variables al store en el futuro -->
                <div class="col-6">
                  <q-card class="bg-white q-pa-md h-full" flat bordered>
                    <q-icon name="groups" size="xl" color="primary" class="q-mb-sm opacity-80" />
                    <div class="text-h5 text-weight-bold">Activos</div>
                    <div class="text-caption text-grey-8">Comensales Registrados</div>
                  </q-card>
                </div>
                <div class="col-6">
                  <q-card class="bg-white q-pa-md h-full" flat bordered>
                    <q-icon name="receipt_long" size="xl" color="orange-8" class="q-mb-sm opacity-80" />
                    <div class="text-h5 text-weight-bold">Gestión</div>
                    <div class="text-caption text-grey-8">Peticiones al Comedor</div>
                  </q-card>
                </div>
              </q-card-section>
            </q-card>
          </div>

        </div>
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
