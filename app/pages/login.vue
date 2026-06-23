<template>
  <q-page class="flex flex-center bg-grey-1 q-pa-md">
    <!-- Contenedor para el tamaño del login -->
    <div class="row full-width justify-center">
      <div class="col-12 col-sm-8 col-md-5 col-lg-3">
        <!-- Tarjeta principal -->
        <q-card class="q-pa-xl shadow-2" style="border-radius: 12px">
          <!-- Encabezado corporativo -->
          <q-card-section class="text-center q-pb-none">
            <div class="text-body2 text-weight-bold text-grey-8">
              Gerencia de Tecnología y de Información TI
            </div>
            <div class="text-body2 text-weight-bold text-grey-8">SIAC</div>
          </q-card-section>

          <!-- Logo -->
          <q-card-section class="row justify-center q-py-lg">
            <div class="col-8">
              <q-img src="/logo.png" fit="contain" />
            </div>
          </q-card-section>

          <!-- Saludo -->
          <q-card-section class="text-center q-pt-none q-pb-lg">
            <div class="text-h5 text-weight-bold text-blue-grey-9">
              Bienvenido
            </div>
            <div class="text-body2 text-grey-6">
              Inicia sesión para continuar
            </div>
          </q-card-section>

          <q-card-section class="q-pt-none">
            <q-form @submit.prevent="submit" class="q-gutter-y-lg">
              <!-- 
                TRUCO QUASAR: Usamos 'borderless' para quitar todos los bordes,
                y aplicamos 'bg-grey-2' y 'rounded-borders' directamente a la clase 
                para tener la caja gris perfecta de tu maqueta.
              -->
              <q-input
                borderless
                v-model="cedula"
                type="text"
                label="Cédula"
                class="bg-grey-2 rounded-borders q-px-md"
                color="primary"
                lazy-rules
                :rules="[(val) => !!val || 'La cédula es obligatoria']"
              >
                <template v-slot:prepend>
                  <q-icon name="person" color="grey-8" />
                </template>
              </q-input>

              <q-input
                borderless
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                label="Contraseña"
                class="bg-grey-2 rounded-borders q-px-md"
                color="primary"
                lazy-rules
                :rules="[(val) => !!val || 'La contraseña es obligatoria']"
              >
                <template v-slot:prepend>
                  <q-icon name="lock" color="grey-8" />
                </template>
                <template v-slot:append>
                  <q-icon
                    :name="showPassword ? 'visibility_off' : 'visibility'"
                    class="cursor-pointer"
                    @click="showPassword = !showPassword"
                    color="grey-8"
                  />
                </template>
              </q-input>

              <div class="q-pt-md">
                <q-btn
                  label="INICIAR SESIÓN"
                  type="submit"
                  color="light-green-7"
                  class="full-width text-weight-medium rounded-borders"
                  size="18px"
                  unelevated
                  :loading="loading"
                />
              </div>
            </q-form>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useLoginForm } from "~/composables/features/useLoginForm";

definePageMeta({
  layout: "blank",
});

// Extraemos TODA la lógica del composable.
// Nuestro componente ahora solo renderiza UI y delega la responsabilidad.
const { cedula, password, showPassword, loading, submit } = useLoginForm();
</script>
