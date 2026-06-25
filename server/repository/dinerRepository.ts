/**
 * REPOSITORIO: Comensales y Peticiones (Diners)
 * 
 * REGLAS DE ARQUITECTURA:
 * - ÚNICO lugar autorizado para importar y usar Prisma.
 * - Cero reglas de negocio. Solo operaciones CRUD (Select, Insert, Update, Delete).
 * - No conoce de eventos ni de peticiones HTTP.
 */

import { prisma } from '../utils/prisma'
import type { Prisma } from '@prisma/client'

// --- COMENSALES (DINERS) ---

export async function getDinersBySubdependency(subdependencyId: number, squadId?: number) {
  return prisma.diner.findMany({
    where: { 
      subdependencyId,
      ...(squadId && { squadId }),
      active: true 
    },
    include: {
      squad: true,
      position: true,
      warehouse: true
    },
    orderBy: { id: 'desc' }
  })
}

export async function getDinersByDependency(dependencyId: number) {
  return prisma.diner.findMany({
    where: { 
      subdependency: {
        dependencyId: dependencyId
      },
      active: true 
    },
    include: {
      squad: true,
      subdependency: true,
      position: true,
      warehouse: true
    },
    orderBy: { id: 'desc' }
  })
}

export async function getDinerByCedula(cedula: string) {
  return prisma.diner.findUnique({
    where: { cedula },
    include: {
      squad: true,
      position: true,
      warehouse: true
    }
  })
}

export async function createDiner(data: { cedula: string, name: string, rationType: string, squadId: number, subdependencyId: number, positionId?: number, warehouseId?: number }) {
  return prisma.diner.create({
    data,
    include: {
      position: true,
      squad: true,
      warehouse: true
    }
  })
}

export async function updateDiner(id: number, data: { cedula?: string, name?: string, rationType?: string, squadId?: number, subdependencyId?: number, positionId?: number, warehouseId?: number }) {
  return prisma.diner.update({
    where: { id },
    data,
    include: {
      position: true,
      squad: true,
      warehouse: true
    }
  })
}

export async function deleteDiner(id: number) {
  // Soft-Delete para no corromper el historial de solicitudes
  return prisma.diner.update({
    where: { id },
    data: { active: false }
  })
}

export async function updateDinerFingerprint(id: number, fingerprint: string) {
  return prisma.diner.update({
    where: { id },
    data: { fingerprint }
  })
}

export async function clearDinerFingerprint(id: number) {
  return prisma.diner.update({
    where: { id },
    data: { fingerprint: null }
  })
}

export async function getDinerByFingerprint(fingerprint: string) {
  return prisma.diner.findFirst({
    where: { fingerprint, active: true },
    include: {
      squad: true,
      position: true,
      warehouse: true
    }
  })
}

// --- PETICIONES (DINER REQUESTS) ---

export async function getRequestsBySubdependency(subdependencyId: number) {
  // Obtenemos todas las peticiones creadas por usuarios que pertenecen a esa subdependencia
  return prisma.dinerRequest.findMany({
    where: {
      createdBy: {
        subdependencyId: subdependencyId
      }
    },
    include: {
      createdBy: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, name: true } },
      _count: {
        select: { details: true }
      }
    },
    orderBy: { date: 'desc' }
  })
}

export async function getRequestById(id: number) {
  return prisma.dinerRequest.findUnique({
    where: { id },
    include: {
      details: {
        include: {
          diner: {
            include: { squad: true }
          }
        }
      }
    }
  })
}

/**
 * Crea una petición de comida junto con todos sus detalles (comensales asociados)
 * de forma atómica usando Prisma Transactions implícitas.
 */
export async function createDinerRequest(data: {
  date: Date,
  shiftType: string,
  createdById: number,
  diners: Array<{ dinerId: number, rationType: string }>
}) {
  return prisma.dinerRequest.create({
    data: {
      date: data.date,
      shiftType: data.shiftType,
      createdById: data.createdById,
      status: 'PENDING',
      details: {
        create: data.diners.map(d => ({
          dinerId: d.dinerId,
          rationType: d.rationType
        }))
      }
    },
    include: {
      details: true
    }
  })
}

export async function updateRequestStatus(id: number, status: string, approvedById?: number) {
  return prisma.dinerRequest.update({
    where: { id },
    data: {
      status,
      approvedById
    }
  })
}
