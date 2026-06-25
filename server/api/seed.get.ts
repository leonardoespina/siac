import { defineEventHandler } from 'h3'
import { prisma } from '../utils/prisma'

export default defineEventHandler(async () => {
  try {
    const leonardo = await prisma.diner.findUnique({
      where: { cedula: '18073921' },
      include: { subdependency: true }
    })

    if (!leonardo || !leonardo.subdependencyId) {
      return { success: false, message: 'No se encontró a Leonardo Espina' }
    }

    const parentDependencyId = leonardo.subdependency!.dependencyId

    const newSubdeps = await Promise.all([
      prisma.subdependency.create({ data: { name: 'División de Redes (Prueba)', dependencyId: parentDependencyId } }),
      prisma.subdependency.create({ data: { name: 'División de Soporte Técnico (Prueba)', dependencyId: parentDependencyId } }),
      prisma.subdependency.create({ data: { name: 'División de Infraestructura (Prueba)', dependencyId: parentDependencyId } })
    ])

    const allTargetSubdeps = [leonardo.subdependencyId as number, ...newSubdeps.map(s => s.id)]

    const squads = await prisma.squad.findMany()
    if (squads.length === 0) {
      return { success: false, message: 'No hay cuadrillas' }
    }

    const warehouses = await prisma.warehouse.findMany()
    if (warehouses.length === 0) {
      return { success: false, message: 'No hay almacenes/comedores' }
    }

    let injectedCount = 0

    for (let i = 1; i <= 50; i++) {
      const randomSubdepId = allTargetSubdeps[Math.floor(Math.random() * allTargetSubdeps.length)]
      const randomSquadId = squads[Math.floor(Math.random() * squads.length)]!.id
      const randomWarehouseId = warehouses[Math.floor(Math.random() * warehouses.length)]!.id
      const rationType = Math.random() > 0.8 ? 'DIETA' : 'NORMAL'
      const cedulaFake = `99${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`

      await prisma.diner.create({
        data: {
          cedula: cedulaFake,
          name: `Comensal Prueba ${i}`,
          rationType: rationType,
          squadId: randomSquadId,
          subdependencyId: randomSubdepId || 1, // Fallback to 1 if undefined
          warehouseId: randomWarehouseId,
          active: true
        }
      })
      injectedCount++
    }

    return { success: true, message: `Inyectados ${injectedCount} trabajadores con éxito.` }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})
