<template>
  <q-page padding>
    <div class="row items-center q-mb-xl">
      <q-icon name="analytics" size="lg" color="primary" class="q-mr-md" />
      <div>
        <div class="text-h4 text-weight-bold text-primary">Reportes Gerenciales</div>
        <div class="text-subtitle1 text-grey-7">Análisis y estadísticas del sistema SIAC</div>
      </div>
    </div>

    <div class="row q-col-gutter-lg">
      <div class="col-12 col-md-4" v-for="report in reports" :key="report.title">
        <q-card class="cursor-pointer hover-card text-center q-pa-lg" bordered flat @click="$router.push(report.route)">
          <q-icon :name="report.icon" :color="report.color" size="72px" class="q-mb-md" />
          <div class="text-h6 text-weight-bold q-mb-sm">{{ report.title }}</div>
          <div class="text-body2 text-grey-7">{{ report.description }}</div>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
const reports = [
  {
    title: 'Valor del Inventario',
    description: 'Valorización económica del inventario actual en Central y Comedores.',
    icon: 'request_quote',
    color: 'green-8',
    route: '/reports/value'
  },
  {
    title: 'Alertas de Stop',
    description: 'Productos críticos, próximos a vencer o con stock por debajo del mínimo.',
    icon: 'warning',
    color: 'orange-9',
    route: '/reports/alerts'
  },
  {
    title: 'Mínimos y Máximos',
    description: 'Análisis de rangos de stock agrupado por rubros y categorías.',
    icon: 'bar_chart',
    color: 'blue-8',
    route: '/reports/minmax'
  },
  {
    title: 'Consumos y Mermas',
    description: 'Historial de despachos y pérdidas en los comedores locales.',
    icon: 'restaurant',
    color: 'purple-8',
    route: '/reports/consumptions'
  },
  {
    title: 'Apoyos Institucionales',
    description: 'Desglose de donaciones agrupadas por Tipo de Institución.',
    icon: 'volunteer_activism',
    color: 'pink-8',
    route: '/reports/institutions'
  },
  {
    title: 'Historial de Turnos',
    description: 'Registro de apertura y cierre de turnos en cada cocina.',
    icon: 'history',
    color: 'teal-8',
    route: '/reports/shifts'
  }
]
</script>

<style scoped>
.hover-card {
  transition: transform 0.2s, box-shadow 0.2s;
}
.hover-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
}
</style>
