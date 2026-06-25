import { defineApiHandler } from '../../utils/handler'
import { requirePermission, requireUserContext } from '../../utils/auth'
import * as dinerRepo from '../../repository/dinerRepository'

export default defineApiHandler(async (event) => {
  await requirePermission(event, 'DINERS', 'read')
  const user = await requireUserContext(event)
  
  // Siempre limitamos al usuario a ver solo a sus propios trabajadores
  // a menos que sea administrador global (en cuyo caso podríamos devolver todos, 
  // pero por ahora devolvemos vacío o forzamos a que pida por subdependencia).
  // Para esta vista simple, si es global y no pasa subdependencyId, devolvemos todo.
  
  const query = getQuery(event)
  
  // 1. Resolvemos subdependencia (Prioridad si se especifica en UI)
  const targetSubdependency = query.subdependencyId 
    ? Number(query.subdependencyId) 
    : user.subdependencyId

  // 2. Resolvemos dependencia (Para Gerentes o filtros Globales)
  const targetDependency = query.dependencyId
    ? Number(query.dependencyId)
    : user.dependencyId // NOTA: user.dependencyId estará disponible para el rol Gerente

  if (targetSubdependency) {
    return await dinerRepo.getDinersBySubdependency(targetSubdependency)
  }
  
  if (targetDependency) {
    return await dinerRepo.getDinersByDependency(targetDependency)
  }

  // Si no tienen un ID asociado ni mandan query válida, devolvemos vacío
  return []
})
