/**
 * Utilidades para parsear rangos de fechas de forma segura y a prueba de huso horario.
 */

export function parseDateRange(startStr?: string | null, endStr?: string | null): { startDate?: Date, endDate?: Date } {
  let startDate: Date | undefined = undefined
  let endDate: Date | undefined = undefined

  if (startStr && startStr.trim() !== '') {
    const clean = startStr.trim().replace(/\//g, '-')
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      startDate = new Date(`${clean}T00:00:00.000`)
    } else {
      const d = new Date(clean)
      if (!isNaN(d.getTime())) startDate = d
    }
  }

  if (endStr && endStr.trim() !== '') {
    const clean = endStr.trim().replace(/\//g, '-')
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      endDate = new Date(`${clean}T23:59:59.999`)
    } else {
      const d = new Date(clean)
      if (!isNaN(d.getTime())) endDate = d
    }
  }

  return { startDate, endDate }
}
