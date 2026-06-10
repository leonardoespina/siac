<script setup lang="ts">
// ── PÁGINA DE INICIO (DASHBOARD) ────────────────────────────────────────────
// Esta es la página principal que se carga al entrar a la raíz ("/").
// Usa componentes genéricos de Quasar (q-page, q-card).
//
// Actualmente está "en blanco" a nivel de negocio. A medida que avancemos,
// conectaremos esta página con los Stores (Pinia) para mostrar métricas reales.
</script>

<template>
  <q-page class="q-pa-lg">
    <div class="text-h4 q-mb-lg">Bienvenido a SIAC</div>
    
    <div class="row q-col-gutter-md">
      <div class="col-12 col-md-6">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-h6">Cimientos Técnicos Listos</div>
            <p class="text-body1 q-mt-md">
              El proyecto base ha sido configurado exitosamente sin modelos de negocio pre-asumidos.
            </p>
            <ul>
              <li>Arquitectura de backend lista (Nuxt Nitro + Prisma)</li>
              <li>UI Framework instalado (Quasar)</li>
              <li>Sistema de enrutamiento funcionando</li>
            </ul>
            <p class="text-grey-8">
              A la espera de tus análisis para comenzar a construir el primer módulo.
            </p>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>
