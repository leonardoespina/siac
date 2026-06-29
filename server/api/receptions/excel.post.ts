import { defineApiHandler } from '../../utils/handler'
import { requireAuth } from '../../utils/auth'
import { importReceptionFromExcel } from '../../services/receptionService'

export default defineApiHandler(async (event) => {
  const userId = await requireAuth(event)
  const body = await readBody(event)

  const { destinationId, supplierId, referenceNumber, rows } = body

  try {
    const createdTransaction = await importReceptionFromExcel(
      userId,
      Number(destinationId),
      Number(supplierId),
      String(referenceNumber).trim(),
      rows
    )

    return {
      success: true,
      message: 'Recepción en Borrador creada con éxito',
      transactionId: createdTransaction.id
    }
  } catch (error: any) {
    console.error('Error in excel.post.ts:', error)
    
    if (error.statusCode === 422 || error.name === 'DomainError' || error.name === 'ValidationError') {
      throw error // Respetar errores de validación
    }

    const shortMsg = error.message ? error.message.replace(/\r?\n|\r/g, ' ').substring(0, 100) : 'Error desconocido'

    throw createError({
      statusCode: 500,
      statusMessage: `DB_ERR: ${shortMsg}`,
      data: {
        message: error.message || 'Error desconocido en la BD',
        stack: error.stack
      }
    })
  }
})
