import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🧹 INICIANDO PURGA TRANSACCIONAL (RESET A CERO)...')

  // 1. Borrar Peticiones de Comensales
  console.log('Borrado detalles de peticiones de comensales...')
  await prisma.dinerRequestDetail.deleteMany()
  console.log('Borrado peticiones de comensales...')
  await prisma.dinerRequest.deleteMany()

  // 2. Borrar Movimientos de Inventario
  console.log('Borrado detalles de transacciones...')
  await prisma.transactionDetail.deleteMany()
  console.log('Borrado transacciones históricas...')
  await prisma.transaction.deleteMany()

  // 3. Borrar Turnos de Operación
  console.log('Cerrando y borrando turnos de cocina/almacén...')
  await prisma.shift.deleteMany()

  // 4. Resetear Stock a Cero (Borrando la tabla Stock)
  console.log('Reseteando existencias de Stock a 0...')
  await prisma.stock.deleteMany()

  // 5. Borrar notificaciones y auditoría (tienen referencias a usuarios)
  console.log('Borrando notificaciones y auditoría...')
  await prisma.notification.deleteMany()
  await prisma.auditLog.deleteMany()

  // 6. Borrar todos los usuarios excepto el Administrador de Prueba
  console.log('Borrando usuarios (excepto V-12345678)...')
  await prisma.user.deleteMany({
    where: {
      cedula: { not: 'V-12345678' }
    }
  })

  // 7. Borrar Catálogos (Productos, Categorías y Unidades)
  console.log('Borrando catálogo de Productos, Categorías y Unidades...')
  await prisma.product.deleteMany()
  await prisma.category.deleteMany()
  await prisma.unit.deleteMany()

  console.log('✅ ¡Purga completada exitosamente! El sistema está en 0, listo para pruebas con un solo usuario y sin catálogos.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
