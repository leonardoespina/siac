// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false,

  modules: [
    '@vite-pwa/nuxt',
    'nuxt-quasar-ui',
    '@pinia/nuxt',
  ],

  quasar: {
    plugins: ['Notify', 'Dialog', 'Loading'],
    extras: {
      fontIcons: ['material-icons'],
    },
  },

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'SIAC — Inventarios de Comedores',
      short_name: 'SIAC',
      description: 'Sistema de Inventarios de Almacenes de Comedores',
      theme_color: '#1976d2',
      background_color: '#ffffff',
      display: 'standalone',
      icons: [
        {
          src: '/icon-192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: '/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
        },
      ],
    },
  },

  typescript: {
    strict: true,
  },

  // Añadido para silenciar la advertencia de Vue DevTools en consola
  vite: {
    optimizeDeps: {
      include: [
        '@vue/devtools-core',
        '@vue/devtools-kit',
        'socket.io-client',
        'xlsx'
      ]
    }
  },


  runtimeConfig: {
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
    public: {
      appName: 'SIAC',
    },
  },

  compatibilityDate: '2025-06-09',
})
