import { ref, readonly } from 'vue'
import { useQuasar } from 'quasar'
import type { TDocumentDefinitions } from 'pdfmake/interfaces'

import pdfMakeModule from 'pdfmake/build/pdfmake'
import pdfFontsModule from 'pdfmake/build/vfs_fonts'

const pdfMake = pdfMakeModule.default || pdfMakeModule
const pdfFonts = pdfFontsModule.default || pdfFontsModule

// Inicializar fuentes globalmente
pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.vfs

export function useInventoryPdfMake() {
  const $q = useQuasar()
  const isGenerating = ref(false)

  // Utilidad para convertir la imagen de public/ a base64 para que pdfmake la incruste
  const getBase64ImageFromUrl = async (url: string): Promise<string> => {
    const res = await fetch(url)
    const blob = await res.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  const downloadPdf = async (warehouseName: string, operatorName: string, items: any[], stats: any) => {
    isGenerating.value = true
    $q.loading.show({ message: 'Generando PDF Vectorial...' })

    try {
      // Cargar Logo en Base64
      let logoBase64 = ''
      try {
        logoBase64 = await getBase64ImageFromUrl('/logo.png')
      } catch (e) {
        console.warn('No se pudo cargar el logo.png', e)
      }

      // Construcción del documento JSON para pdfmake
      const docDefinition: TDocumentDefinitions = {
        pageSize: 'A4',
        pageMargins: [40, 40, 40, 40],
        content: [
          // CABECERA CON LOGO
          {
            columns: [
              {
                width: 80,
                ...(logoBase64 ? { image: logoBase64, width: 60 } : { text: '' })
              },
              {
                width: '*',
                stack: [
                  { text: 'REPORTE DE INVENTARIO FÍSICO', style: 'header', alignment: 'center' },
                  { text: 'SISTEMA INTEGRAL DE ALMACENES DE COMEDORES (SIAC)', style: 'subheader', alignment: 'center', margin: [0, 0, 0, 20] }
                ]
              },
              {
                width: 80,
                text: ''
              }
            ],
            margin: [0, 0, 0, 20]
          },
          
          // INFO BLOQUE
          {
            columns: [
              {
                stack: [
                  { text: [ { text: 'Comedor / Almacén: ', bold: true }, warehouseName ] },
                  { text: [ { text: 'Fecha de Reporte: ', bold: true }, new Date().toLocaleString() ] },
                  { text: [ { text: 'Operador Solicitante: ', bold: true }, operatorName ] }
                ]
              },
              {
                alignment: 'right',
                stack: [
                  { text: [ { text: 'Total en Catálogo: ', bold: true }, `${stats.totalItems} productos` ] },
                  { text: [ { text: 'Con Existencia: ', bold: true }, `${stats.inStock} productos` ] },
                  { text: [ { text: 'Agotados: ', bold: true }, `${stats.outOfStock} productos` ] }
                ]
              }
            ],
            margin: [0, 0, 0, 20]
          },

          { text: 'DETALLE DE STOCK VIGENTE', bold: true, margin: [0, 0, 0, 5] },
          
          // TABLA DE INVENTARIO
          {
            table: {
              headerRows: 1,
              widths: ['auto', '*', 'auto', 'auto'],
              body: [
                [
                  { text: 'Cód', style: 'tableHeader' },
                  { text: 'Producto', style: 'tableHeader' },
                  { text: 'Categoría', style: 'tableHeader' },
                  { text: 'Stock Disponible', style: 'tableHeader', alignment: 'center' }
                ],
                ...items.map(p => {
                  const stockText = p.localStock > 0 ? `${p.localStock} ${p.unit?.abbreviation || 'UN'}` : 'AGOTADO'
                  const stockColor = p.localStock > 0 ? 'black' : 'red'
                  const isBold = p.localStock <= 0
                  return [
                    p.code,
                    p.name,
                    p.category?.name || 'Sin Categoría',
                    { text: stockText, alignment: 'center', color: stockColor, bold: isBold }
                  ]
                })
              ]
            },
            margin: [0, 0, 0, 30]
          },

          // FIRMAS
          { 
            unbreakable: true,
            stack: [
              { text: 'El presente documento da fe de la existencia física de la mercancía registrada en este comedor/almacén a la fecha de emisión del reporte.', fontSize: 8, color: 'gray', alignment: 'center', margin: [0, 0, 0, 40] },
              {
                columns: [
                  { stack: [ { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 120, y2: 0, lineWidth: 1 }] }, { text: 'Generado Por', bold: true, margin: [0, 5, 0, 0] }, { text: operatorName, fontSize: 10 } ], alignment: 'center' },
                  { stack: [ { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 120, y2: 0, lineWidth: 1 }] }, { text: 'Auditado Por (PCP)', bold: true, margin: [0, 5, 0, 0] }, { text: 'Firma y Sello', fontSize: 10 } ], alignment: 'center' },
                  { stack: [ { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 120, y2: 0, lineWidth: 1 }] }, { text: 'Validado Por (GNB)', bold: true, margin: [0, 5, 0, 0] }, { text: 'Firma y Sello', fontSize: 10 } ], alignment: 'center' }
                ]
              }
            ]
          }
        ],
        styles: {
          header: { fontSize: 18, bold: true },
          subheader: { fontSize: 12 },
          tableHeader: { bold: true, fillColor: '#f5f5f5', margin: [0, 5, 0, 5] }
        },
        defaultStyle: {
          fontSize: 10,
          columnGap: 20
        }
      }

      const cleanWarehouseName = warehouseName.replace(/[^a-zA-Z0-9]/g, '_')
      const filename = `Inventario_${cleanWarehouseName}_${new Date().toISOString().split('T')[0]}.pdf`
      pdfMake.createPdf(docDefinition).download(filename)
      $q.notify({ type: 'positive', message: 'PDF de Inventario descargado exitosamente.' })

    } catch (error) {
      console.error('Error generando PDF de inventario:', error)
      $q.notify({ type: 'negative', message: 'Error al generar el PDF de inventario con pdfmake.' })
    } finally {
      $q.loading.hide()
      isGenerating.value = false
    }
  }

  return {
    isGenerating: readonly(isGenerating),
    downloadPdf
  }
}
