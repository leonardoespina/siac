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
  
  // Usamos el ID de la query si lo envían (útil para admins filtrando), 
  // sino, usamos la subdependencia asignada al propio usuario.
  const targetSubdependency = query.subdependencyId 
    ? Number(query.subdependencyId) 
    : user.subdependencyId

  if (!targetSubdependency) {
    // Si no tienen un ID asociado ni mandan query, no devolvemos nada 
    // para evitar saturar la red con miles de registros.
    return []
  }

  return await dinerRepo.getDinersBySubdependency(targetSubdependency)
})
