import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'

const connectionString = process.env.DATABASE_URL
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Iniciando carga de datos (Seed)...')

  // 1. Crear los módulos del sistema
  const modulesData = [
    { code: 'PRODUCTS', name: 'Catálogo de Productos' },
    { code: 'CATEGORIES', name: 'Categorías de Productos' },
    { code: 'UNITS', name: 'Unidades de Medida' },
    { code: 'WAREHOUSES', name: 'Gestión de Almacenes' },
    { code: 'SECURITY', name: 'Seguridad y Accesos' },
    { code: 'RECEPTIONS', name: 'Recepciones y Compras' },
    { code: 'TRANSFERS', name: 'Transferencias' },
    { code: 'OPERATIONS', name: 'Operación Diaria y Consumos' },
    { code: 'REPORTS', name: 'Reportes e Historial' },
    { code: 'POSITIONS', name: 'Catálogo de Cargos' },
    { code: 'DINERS', name: 'Directorio de Comensales' },
    { code: 'DISPATCH', name: 'Despacho Rápido' },
    { code: 'BIOMETRIC', name: 'Gestión Biométrica' }
  ]

  const modules = []
  for (const mod of modulesData) {
    const created = await prisma.module.upsert({
      where: { code: mod.code },
      update: { name: mod.name },
      create: mod
    })
    modules.push(created)
  }
  console.log('✅ Módulos creados:', modules.map(m => m.code).join(', '))

  // 2. Crear el rol ADMINISTRADOR
  const roleAdmin = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: {
      name: 'ADMIN',
      description: 'Administrador del Sistema',
    },
  })
  console.log('✅ Rol ADMIN creado.')

  // 3. Darle permisos al ADMINISTRADOR sobre TODOS los módulos
  for (const mod of modules) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_moduleId: {
          roleId: roleAdmin.id,
          moduleId: mod.id,
        },
      },
      update: {
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: true,
      },
      create: {
        roleId: roleAdmin.id,
        moduleId: mod.id,
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: true,
      },
    })
  }
  console.log('✅ Permisos Totales asignados al Rol ADMIN.')

  // 4. Crear el usuario de prueba
  const passwordHash = await bcrypt.hash('123456', 10)
  
  await prisma.user.upsert({
    where: { cedula: 'V-12345678' },
    update: {
      passwordHash: passwordHash, // Restaura la contraseña si alguien la cambió
      roleId: roleAdmin.id,
    },
    create: {
      cedula: 'V-12345678',
      name: 'Administrador de Prueba',
      passwordHash: passwordHash,
      roleId: roleAdmin.id,
    },
  })
  console.log('✅ Usuario Administrador creado (Cédula: V-12345678 | Pass: 123456).')

  console.log('🚀 Seed terminado exitosamente.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
