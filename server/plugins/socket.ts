import { Server as SocketServer } from 'socket.io'

// Variable global para mantener la instancia y usarla en otros endpoints
export let io: SocketServer

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    // Enlazar socket.io al servidor HTTP subyacente de Nuxt solo la primera vez
    const server = (event.node.req.socket as any)?.server
    if (server && !server.__sio) {
      io = new SocketServer(server, {
        cors: {
          origin: '*',
          methods: ['GET', 'POST']
        }
      })
      server.__sio = io

      console.log('⚡ Socket.io servidor inicializado correctamente.')

      io.on('connection', (socket) => {
        // Cuando un usuario se loguea en el frontend, enviará un evento 'join' con su ID
        socket.on('join', (userId: number) => {
          socket.join(`user_${userId}`)
          
          // También los unimos a "salas" según su rol si quisiéramos mandar alertas masivas
          // socket.join(`role_${roleName}`)
        })
      })
    }
  })
})
