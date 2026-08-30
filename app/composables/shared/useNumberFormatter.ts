/**
 * Utilidades centralizadas para formateo y redondeo de cantidades y monedas en SIAC.
 * Resuelve y previene los artefactos de precisión de punto flotante de JavaScript (ej: 14.001000000000001).
 */

export function roundQty(val: number | string | null | undefined): number {
  if (val === null || val === undefined || val === '') return 0
  const num = Number(val)
  if (isNaN(num)) return 0
  return Math.round((num + Number.EPSILON) * 100) / 100
}

export function formatQuantity(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === '') return '0'
  const num = Number(val)
  if (isNaN(num)) return '0'
  const rounded = roundQty(num)
  return rounded.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })
}

export function formatCurrency(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === '') return '$0.00'
  const num = Number(val)
  if (isNaN(num)) return '$0.00'
  const rounded = roundQty(num)
  return `$${rounded.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`
}

export function useNumberFormatter() {
  return {
    roundQty,
    formatQuantity,
    formatCurrency
  }
}
