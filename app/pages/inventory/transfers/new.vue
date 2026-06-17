<template>
  <q-page padding>
    <div class="row items-center q-mb-md">
      <q-btn flat round icon="arrow_back" color="primary" to="/inventory/transfers" class="q-mr-sm" />
      <div class="text-h4 text-weight-bold text-primary">Nueva Transferencia</div>
    </div>

    <div class="row q-col-gutter-md">
      <!-- PANEL IZQUIERDO: Buscador y Selección -->
      <div class="col-12 col-md-5">
        <q-card bordered flat class="q-mb-md">
          <q-card-section class="bg-grey-2">
            <div class="text-subtitle1 text-weight-bold">Configuración de Envío</div>
          </q-card-section>
          <q-card-section>
            <div class="text-caption text-grey q-mb-sm">Origen (Automático)</div>
            <q-input :model-value="centralWarehouse?.name || 'Cargando...'" readonly outlined dense disable class="q-mb-md">
              <template v-slot:prepend><q-icon name="store" /></template>
            </q-input>

            <q-select
              v-model="destinationId"
              :options="localWarehouses"
              option-value="id"
              option-label="name"
              emit-value map-options
              label="Cocina Destino *"
              outlined dense
              color="primary"
            >
              <template v-slot:prepend><q-icon name="restaurant" /></template>
            </q-select>
          </q-card-section>
        </q-card>

        <q-card bordered flat>
          <q-card-section class="bg-grey-2">
            <div class="text-subtitle1 text-weight-bold">Añadir Productos</div>
          </q-card-section>
          <q-card-section>
            <q-input v-model="searchQuery" outlined dense placeholder="Buscar producto por nombre o código..." class="q-mb-sm" clearable>
              <template v-slot:append><q-icon name="search" /></template>
            </q-input>

            <q-list bordered separator v-if="filteredProducts.length > 0">
              <q-item v-for="product in filteredProducts" :key="product.id" clickable @click="addItem(product)">
                <q-item-section>
                  <q-item-label>{{ product.name }}</q-item-label>
                  <q-item-label caption>Código: {{ product.code }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <div class="text-caption text-grey">Stock en Central</div>
                  <q-badge :color="getCentralStock(product.id) > 0 ? 'green' : 'red'">
                    {{ getCentralStock(product.id) }} {{ product.unit?.abbreviation }}
                  </q-badge>
                </q-item-section>
              </q-item>
            </q-list>
            <div v-else-if="searchQuery" class="text-center text-grey q-py-md">
              No se encontraron productos
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- PANEL DERECHO: Cesta de Transferencia -->
      <div class="col-12 col-md-7">
        <q-card bordered flat>
          <q-card-section class="bg-grey-2 row justify-between items-center">
            <div class="text-subtitle1 text-weight-bold">Cesta de Envío</div>
            <q-toggle v-model="showPrices" label="Mostrar Precios" color="primary" />
          </q-card-section>

          <q-card-section v-if="transferItems.length === 0" class="text-center text-grey q-py-xl">
            <q-icon name="shopping_basket" size="4rem" color="grey-4" />
            <div class="text-h6 q-mt-md">La cesta está vacía</div>
            <p>Busca y selecciona productos en el panel izquierdo.</p>
          </q-card-section>

          <q-list separator v-else>
            <q-item v-for="(item, index) in transferItems" :key="item.productId" class="q-py-md">
              <q-item-section>
                <q-item-label class="text-weight-bold">{{ item.productName }}</q-item-label>
                <q-item-label caption>Stock Central: {{ item.availableStock }} {{ item.unit }}</q-item-label>
              </q-item-section>

              <q-item-section style="max-width: 150px" v-if="showPrices">
                <q-input v-model.number="item.unitPrice" type="number" label="Precio" dense outlined prefix="$" />
              </q-item-section>

              <q-item-section style="max-width: 150px">
                <q-input v-model.number="item.quantity" type="number" label="Cantidad a enviar" dense outlined :suffix="item.unit" />
              </q-item-section>

              <q-item-section side>
                <q-btn flat round color="negative" icon="delete" @click="removeItem(index)" />
              </q-item-section>
            </q-item>
          </q-list>

          <q-separator />
          
          <q-card-actions align="right" class="q-pa-md">
            <q-btn flat label="Cancelar" color="grey" to="/inventory/transfers" />
            <q-btn color="primary" icon="save" label="Guardar Borrador" @click="saveDraft" :loading="saving" :disable="transferItems.length === 0" />
          </q-card-actions>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '~/stores/auth'
import { useTransferForm } from '~/composables/features/useTransferForm'
import { useWarehousesStore } from '~/stores/warehouses'
import { useProductsStore } from '~/stores/products'

const auth = useAuthStore()
const router = useRouter()

// Protección de Ruta: Solo Admin puede crear transferencias
const role = auth.user?.role?.name?.toUpperCase()
if (role !== 'ADMIN' && role !== 'ADMINISTRADOR') {
  router.push('/inventory/transfers')
}

const warehousesStore = useWarehousesStore()
const productsStore = useProductsStore()

onMounted(async () => {
  if (warehousesStore.warehouses.length === 0) await warehousesStore.fetchAll()
  if (productsStore.products.length === 0) await productsStore.fetchAll()
})

const {
  saving, destinationId, searchQuery, transferItems, showPrices,
  localWarehouses, filteredProducts, centralWarehouse,
  getCentralStock, addItem, removeItem, saveDraft
} = useTransferForm()
</script>
