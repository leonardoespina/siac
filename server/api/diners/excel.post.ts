import { defineApiHandler } from '../../utils/handler'
import { requirePermission, requireUserContext } from '../../utils/auth'
import { prisma } from '../../utils/prisma'
import { ValidationError, ForbiddenError } from '../../domain/errors'
import { emitEvent } from '../../utils/eventBus'

export default defineApiHandler(async (event) => {
  // 1. Verificación de permisos
  await requirePermission(event, 'DINERS', 'create')
  const user = await requireUserContext(event)
  
  const body = await readBody(event)
  const rows = body.rows as Array<any>
  
  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    throw new ValidationError('No se enviaron datos válidos para procesar.')
  }

  // Sanitizar todas las cédulas antes de procesar
  rows.forEach(r => {
    if (r.cedula) {
      r.cedula = String(r.cedula).replace(/\D/g, '')
    }
  })

  const uniqueAreas = [...new Set(rows.map(r => r.areaName))]
  const uniquePositions = [...new Set(rows.filter(r => r.positionName).map(r => r.positionName))]
  const uniqueSquads = [...new Set(rows.map(r => r.squadName))]
  const uniqueWarehouses = [...new Set(rows.map(r => r.comedorName))]

  // A. Resolver Cargos (Positions)
  const positionMap = new Map<string, number>()
  for (const posName of uniquePositions) {
    const position = await prisma.position.findFirst({
      where: { name: { equals: posName, mode: 'insensitive' } }
    })
    if (!position) {
      throw new ValidationError(`El cargo '${posName}' no existe en el sistema. Debe crearlo primero.`)
    }
    positionMap.set(posName.toUpperCase(), position.id)
  }

  // B. Resolver Cuadrillas (Squads)
  const squadMap = new Map<string, number>()
  for (const sqName of uniqueSquads) {
    const squad = await prisma.squad.findFirst({
      where: { name: { equals: sqName, mode: 'insensitive' } }
    })
    if (!squad) {
      throw new ValidationError(`La cuadrilla '${sqName}' no existe en el sistema. Asegúrate de escribirla correctamente (ej: 'Administrativa', 'Cuadrilla A').`)
    }
    squadMap.set(sqName.toUpperCase(), squad.id)
  }

  // C. Resolver Áreas (Subdependencies) y Validar Permisos
  const areaMap = new Map<string, number>()
  for (const areaName of uniqueAreas) {
    if (!areaName) {
      throw new ValidationError(`La columna 'Área Destino' es obligatoria en todas las filas.`)
    }
    const subdep = await prisma.subdependency.findFirst({
      where: { name: { equals: areaName as string, mode: 'insensitive' } }
    })
    if (!subdep) {
      throw new ValidationError(`El área '${areaName}' no existe en el sistema. Asegúrate de escribirla correctamente.`)
    }

    // Validaciones de seguridad por cada área
    if (!user.isGlobal) {
      if (user.dependencyId && !user.subdependencyId) {
        // Gerente: el área debe pertenecer a su dependencia
        if (subdep.dependencyId !== user.dependencyId) {
          throw new ForbiddenError(`No tienes permiso para importar a '${areaName}' porque no pertenece a tu Gerencia.`)
        }
      } else if (user.subdependencyId) {
        // Usuario de área: solo puede importar a su propia área
        if (subdep.id !== user.subdependencyId) {
          throw new ForbiddenError(`Tu usuario solo puede importar trabajadores a tu propia área. Remueve los de '${areaName}'.`)
        }
      }
    }

    areaMap.set((areaName as string).toUpperCase(), subdep.id)
  }

  // D. Resolver Comedores (Warehouses)
  const warehouseMap = new Map<string, number>()
  for (const wName of uniqueWarehouses) {
    if (!wName) {
      throw new ValidationError(`La columna Comedor es obligatoria en todas las filas.`)
    }
    const warehouse = await prisma.warehouse.findFirst({
      where: { name: { equals: wName as string, mode: 'insensitive' },
      type:'LOCAL' }
    })
    if (!warehouse) {
      throw new ValidationError(`El comedor '${wName}' no existe en el sistema. Asegúrate de escribirlo correctamente.`)
    }
    warehouseMap.set((wName as string).toUpperCase(), warehouse.id)
  }

  // 3. Procesar en lote (Upsert por cada trabajador)
  // Como Prisma no soporta upsert batch (createMany no hace upsert en Postgres de forma nativa sin onConflict si hay joins, pero findUnique / upsert sí)
  // Iteramos secuencialmente dentro de una transacción.
  
  const results = await prisma.$transaction(async (tx) => {
    const processedDiners = []
    
    for (const row of rows) {
      const posId = row.positionName ? positionMap.get(row.positionName.toUpperCase()) : null
      const sqId = squadMap.get(row.squadName.toUpperCase())
      const wId = warehouseMap.get(row.comedorName.toUpperCase())
      const subId = areaMap.get(row.areaName.toUpperCase())

      if (!sqId || !wId || !subId) continue // Salvaguarda

      const upsertedDiner = await tx.diner.upsert({
        where: { cedula: row.cedula },
        update: {
          name: row.name,
          rationType: row.rationType,
          squadId: sqId,
          subdependencyId: subId,
          warehouseId: wId,
          positionId: posId || null,
          active: true // Si estaba inactivo, el Excel lo revive
        },
        create: {
          cedula: row.cedula,
          name: row.name,
          rationType: row.rationType,
          squadId: sqId,
          subdependencyId: subId,
          warehouseId: wId,
          positionId: posId || null,
          active: true
        },
        include: {
          position: true,
          squad: true
        }
      })
      
      processedDiners.push(upsertedDiner)
    }
    return processedDiners
  })

  // 4. Emitir eventos WebSockets
  for (const diner of results) {
    emitEvent('diner:updated', { diner })
  }

  return { success: true, count: results.length }
})
