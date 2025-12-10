/**
 * Document Analysis with OpenAI
 * Analyzes PDFs (via text extraction) and images (via Vision API)
 * 
 * NOTE: GPT-4o Vision does NOT support PDFs directly.
 * For PDFs, we extract the text using pdf-parse and send it as text context.
 * For images, we use the Vision API directly.
 */

import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export interface DocumentAnalysisOptions {
  fileUrl: string
  analysisGoal?: string
  userId: string
}

export interface DocumentAnalysisResult {
  summary: string
  suggestedTasks: Array<{
    name: string
    description: string
    priority: 'Alta' | 'Media' | 'Baja'
  }>
  keyPoints: string[]
  analysisDate: string
  fileUrl: string
  totalSuggestedTasks: number
  message: string
  needsConfirmation: boolean
}

/**
 * Extract text content from a PDF file using pdf-parse v2
 * Uses dynamic import to avoid bundling issues with Next.js
 * First tries URL loading, then falls back to fetching data as buffer
 */
export async function extractPdfText(fileUrl: string): Promise<string> {
  console.log('[extractPdfText] Starting PDF extraction for URL:', fileUrl.substring(0, 100))
  
  try {
    // Dynamic import to avoid Next.js bundling issues
    const { PDFParse } = await import('pdf-parse')
    
    // First try: Use URL directly (works with most public URLs)
    try {
      console.log('[extractPdfText] Trying URL mode...')
      const parser = new PDFParse({ url: fileUrl })
      const textResult = await parser.getText()
      await parser.destroy()
      
      const text = textResult.text || ''
      console.log(`[extractPdfText] URL mode success! Extracted ${text.length} chars`)
      
      // Return extracted text, truncated if too long (GPT-4o context limit)
      const maxChars = 100000 // ~25k tokens approximately
      if (text.length > maxChars) {
        console.warn(`PDF text truncated from ${text.length} to ${maxChars} characters`)
        return text.substring(0, maxChars) + '\n\n[... documento truncado por longitud ...]'
      }
      
      return text
    } catch (urlError) {
      console.warn('[extractPdfText] URL mode failed, trying buffer mode:', urlError instanceof Error ? urlError.message : urlError)
      
      // Second try: Fetch the PDF as buffer and parse
      const response = await fetch(fileUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`)
      }
      
      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      
      console.log(`[extractPdfText] Fetched PDF, size: ${buffer.length} bytes`)
      
      const parser = new PDFParse({ data: buffer })
      const textResult = await parser.getText()
      await parser.destroy()
      
      const text = textResult.text || ''
      console.log(`[extractPdfText] Buffer mode success! Extracted ${text.length} chars`)
      
      // Return extracted text, truncated if too long
      const maxChars = 100000
      if (text.length > maxChars) {
        console.warn(`PDF text truncated from ${text.length} to ${maxChars} characters`)
        return text.substring(0, maxChars) + '\n\n[... documento truncado por longitud ...]'
      }
      
      return text
    }
  } catch (error) {
    console.error('[extractPdfText] All methods failed:', error)
    throw new Error(`No se pudo extraer el texto del PDF: ${error instanceof Error ? error.message : 'Error desconocido'}`)
  }
}

/**
 * Analyze a document (PDF or image) using OpenAI GPT-4o
 * - PDFs: Extracts text with pdf-parse, then analyzes with GPT-4o
 * - Images: Uses GPT-4o Vision API directly
 */
export async function analyzeDocument(
  options: DocumentAnalysisOptions
): Promise<DocumentAnalysisResult> {
  const { fileUrl, analysisGoal = 'extraer información clave y sugerir tareas', userId } = options

  try {
    // Determine file type from URL (handle URLs with query params)
    // Extract the path without query parameters for extension checking
    const urlPath = fileUrl.split('?')[0].toLowerCase()
    const isPDF = urlPath.endsWith('.pdf') || urlPath.includes('.pdf')
    const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)/i.test(urlPath)

    console.log('[DocumentAnalysis] Detecting file type:', { fileUrl: fileUrl.substring(0, 100), urlPath: urlPath.substring(0, 100), isPDF, isImage })

    if (!isPDF && !isImage) {
      throw new Error(`Tipo de archivo no soportado. Solo se aceptan PDFs e imágenes. URL: ${urlPath.substring(0, 100)}`)
    }

    if (isPDF) {
      // Extract text from PDF using pdf-parse
      console.log('[DocumentAnalysis] Extracting text from PDF...')
      const pdfText = await extractPdfText(fileUrl)
      
      if (!pdfText || pdfText.trim().length < 50) {
        throw new Error('No se pudo extraer texto del PDF. El documento puede estar vacío, escaneado como imagen, o protegido.')
      }
      
      console.log(`[DocumentAnalysis] Extracted ${pdfText.length} characters from PDF`)

      // Analyze extracted text with GPT-4o (text mode, not vision)
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Eres un asistente experto en análisis de documentos. Tu trabajo es extraer información clave y sugerir tareas accionables basándote en el contenido. SIEMPRE responde en formato JSON válido con los campos: summary, suggestedTasks (array de objetos con name, description, priority), keyPoints (array de strings).'
          },
          {
            role: 'user',
            content: `Analiza el siguiente contenido extraído de un documento PDF y ${analysisGoal}.\n\nDevuelve un JSON con este formato:\n{"summary": "resumen del documento", "suggestedTasks": [{"name": "nombre tarea", "description": "descripcion", "priority": "Alta/Media/Baja"}], "keyPoints": ["punto 1", "punto 2"]}\n\n--- CONTENIDO DEL PDF ---\n${pdfText}\n--- FIN DEL CONTENIDO ---`
          }
        ],
        max_tokens: 4096,
        temperature: 0.3
      })

      const result = response.choices[0]?.message?.content
      if (!result) {
        throw new Error('No se recibió respuesta del análisis')
      }

      // Parse JSON from response
      const jsonMatch = result.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return {
          summary: parsed.summary || 'No se pudo generar un resumen',
          suggestedTasks: parsed.suggestedTasks || [],
          keyPoints: parsed.keyPoints || [],
          analysisDate: new Date().toISOString(),
          fileUrl,
          totalSuggestedTasks: parsed.suggestedTasks?.length || 0,
          message: parsed.suggestedTasks && parsed.suggestedTasks.length > 0
            ? `He analizado el documento PDF y encontré ${parsed.suggestedTasks.length} posibles tareas. Te muestro los detalles para que confirmes cuáles deseas crear.`
            : 'He analizado el documento PDF. Aquí tienes el resumen.',
          needsConfirmation: (parsed.suggestedTasks?.length || 0) > 0
        }
      }
      
      throw new Error('No se pudo parsear la respuesta del análisis')
    }

    // For images, use image_url directly
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Eres un asistente experto en análisis de documentos. Tu trabajo es extraer información clave y sugerir tareas accionables basándote en el contenido. SIEMPRE responde en formato JSON válido con los campos: summary, suggestedTasks (array de objetos con name, description, priority), keyPoints (array de strings).'
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analiza el siguiente documento y ${analysisGoal}. Devuelve un JSON con este formato: {"summary": "resumen del documento", "suggestedTasks": [{"name": "nombre tarea", "description": "descripcion", "priority": "Alta/Media/Baja"}], "keyPoints": ["punto 1", "punto 2"]}`
            },
            {
              type: 'image_url',
              image_url: {
                url: fileUrl
              }
            }
          ]
        }
      ],
      max_tokens: 4096,
      temperature: 0.3
    })

    // Parse response
    const assistantMessage = response.choices[0]?.message?.content

    if (!assistantMessage) {
      throw new Error('No se recibió respuesta del modelo')
    }

    // Parse JSON response
    let analysisResult: Partial<DocumentAnalysisResult>
    
    try {
      // Try to extract JSON from response
      const jsonMatch = assistantMessage.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in response')
      }
    } catch (error) {
      // Fallback if JSON parsing fails
      analysisResult = {
        summary: assistantMessage,
        suggestedTasks: [],
        keyPoints: [],
      }
    }

    // Add metadata
    const result: DocumentAnalysisResult = {
      summary: analysisResult.summary || 'No se pudo generar un resumen',
      suggestedTasks: analysisResult.suggestedTasks || [],
      keyPoints: analysisResult.keyPoints || [],
      analysisDate: new Date().toISOString(),
      fileUrl,
      totalSuggestedTasks: analysisResult.suggestedTasks?.length || 0,
      message: analysisResult.suggestedTasks && analysisResult.suggestedTasks.length > 0
        ? `He analizado el documento y encontré ${analysisResult.suggestedTasks.length} posibles tareas. Te muestro los detalles para que confirmes cuáles deseas crear.`
        : 'He analizado el documento. Aquí tienes el resumen.',
      needsConfirmation: (analysisResult.suggestedTasks?.length || 0) > 0
    }

    return result

  } catch (error) {
    console.error('Error analyzing document:', error)
    
    return {
      summary: 'Error al procesar el documento',
      suggestedTasks: [],
      keyPoints: [],
      analysisDate: new Date().toISOString(),
      fileUrl,
      totalSuggestedTasks: 0,
      message: `Hubo un error al analizar el documento: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      needsConfirmation: false
    }
  }
}
