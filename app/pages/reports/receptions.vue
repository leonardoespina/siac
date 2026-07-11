<template>
  <q-page padding>
    <div class="row items-center q-mb-lg">
      <q-btn flat round icon="arrow_back" color="primary" to="/reports" class="q-mr-sm" />
      <div class="text-h4 text-weight-bold text-primary">Reporte Consolidado de Recepciones</div>
    </div>

    <q-card bordered flat class="q-mb-md">
      <q-card-section class="row q-col-gutter-md items-center">
        <div class="col-12 col-md-3">
          <q-input v-model="dateRange.from" type="date" label="Desde" dense outlined />
        </div>
        <div class="col-12 col-md-3">
          <q-input v-model="dateRange.to" type="date" label="Hasta" dense outlined />
        </div>
        <div class="col-12 col-md-3">
          <q-select v-model="selectedCategory" :options="categoriesStore.categories" option-value="id" option-label="name" emit-value map-options label="Categoría (Opcional)" dense outlined clearable />
        </div>
        <div class="col-12 col-md-3 row q-col-gutter-sm">
           <div class="col-6">
             <q-btn color="primary" icon="search" label="Generar" class="full-width" @click="generateReport" :loading="loading" />
           </div>
           <div class="col-6">
             <q-btn color="grey-8" outline icon="cleaning_services" label="Limpiar" class="full-width" @click="clearReport" />
           </div>
        </div>
      </q-card-section>
    </q-card>

    <q-card bordered flat v-if="reportsStore.matrixData">
      <q-card-section class="row justify-between items-center bg-grey-2">
        <div class="text-subtitle1 text-weight-bold">Vista Previa Matricial</div>
        <q-btn color="green-9" icon="download" label="Exportar a Excel (.xlsx)" @click="download" />
      </q-card-section>
      
      <div class="q-pa-md">
        <!-- Reemplazo de <table> HTML por componente nativo <q-markup-table> -->
        <q-markup-table flat bordered wrap-cells class="full-width">
          <thead class="bg-primary text-white">
            <tr>
              <th class="text-left">Descripción</th>
              <th class="text-left">Unidad</th>
              <th class="text-center" v-for="d in reportsStore.matrixData.dispatches" :key="d.id">{{ d.label }}</th>
              <th class="text-center bg-accent text-white">TOTAL</th>
            </tr>
          </thead>
          <tbody v-if="reportsStore.matrixData.rows.length > 0">
            <tr v-for="row in reportsStore.matrixData.rows" :key="row.id">
              <td class="text-left">{{ row.name }}</td>
              <td class="text-left">{{ row.unit }}</td>
              <td class="text-center" v-for="d in reportsStore.matrixData.dispatches" :key="d.id">
                {{ row.quantities[d.id] || '-' }}
              </td>
              <td class="text-center text-weight-bold bg-grey-3 text-black">{{ row.total }}</td>
            </tr>
            <!-- Fila de Total General -->
            <tr class="bg-blue-grey-1 text-weight-bold" v-if="reportsStore.matrixData.rows.length > 0">
              <td colspan="2" class="text-right">TOTAL GENERAL</td>
              <td class="text-center" v-for="d in reportsStore.matrixData.dispatches" :key="'tot-'+d.id">
                {{ columnTotal(d.id) }}
              </td>
              <td class="text-center text-black">{{ grandTotal }}</td>
            </tr>
          </tbody>
          <tbody v-else>
            <tr>
              <td :colspan="(reportsStore.matrixData?.dispatches?.length || 0) + 3" class="text-center q-pa-lg text-grey">
                No hay recepciones en este periodo/categoría.
              </td>
            </tr>
          </tbody>
        </q-markup-table>
      </div>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useExcelMatrixReport } from '~/composables/features/useExcelMatrixReport'
import { useReportsStore } from '~/stores/reports'
import { useCategoriesStore } from '~/stores/categories'

const dateRange = ref({ from: '', to: '' })
const selectedCategory = ref<number | null>(null)
const { loading, fetchMatrix, exportExcel, clearMatrix } = useExcelMatrixReport()
const reportsStore = useReportsStore()
const categoriesStore = useCategoriesStore()

onMounted(() => {
  categoriesStore.fetchAll()
})

const columnTotal = (dispatchId: number) => {
  if (!reportsStore.matrixData) return 0
  return reportsStore.matrixData.rows.reduce((sum, row) => sum + (row.quantities[dispatchId] || 0), 0)
}

const grandTotal = computed(() => {
  if (!reportsStore.matrixData) return 0
  return reportsStore.matrixData.rows.reduce((sum, row) => sum + row.total, 0)
})

const generateReport = async () => {
  if (!dateRange.value.from || !dateRange.value.to) return
  await fetchMatrix({ 
    startDate: dateRange.value.from, 
    endDate: dateRange.value.to,
    categoryId: selectedCategory.value ? Number(selectedCategory.value) : undefined
  })
}

const clearReport = () => {
  clearMatrix()
  dateRange.value = { from: '', to: '' }
  selectedCategory.value = null
}

const download = () => {
  const title = `RELACION DE RECEPCIONES DEL ${dateRange.value.from} AL ${dateRange.value.to}`
  exportExcel(title)
}
</script>
