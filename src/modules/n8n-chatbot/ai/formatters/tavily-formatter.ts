// Define los tipos de datos para la respuesta de Tavily para mayor seguridad
interface TavilyResult {
  title?: string;
  url?: string;
  content?: string;
}

export interface TavilyResponse {
  answer?: string;
  results?: TavilyResult[];
}

// Define el tipo de objeto que la función devolverá
interface FormattedResponse {
  response: string;
  status: 'success';
}

/**
 * Formatea la respuesta cruda de la API de Tavily a un texto limpio en formato Markdown,
 * ideal para ser procesado por el LLM.
 * @param data La respuesta JSON cruda del flujo de n8n de Tavily.
 * @returns Un objeto con el texto formateado y un estado.
 */
export function formatTavilyResponse(data: TavilyResponse): FormattedResponse {
  const answer = data.answer || '';
  const results = Array.isArray(data.results) ? data.results : [];

  // Función para limpiar texto que podría romper el JSON o el Markdown.
  // Se usa new RegExp() para máxima compatibilidad de entorno.
  function cleanText(text: string | undefined | null): string {
    if (!text) return '';
    return text
      .replace(new RegExp('\\n|\\r', 'g'), ' ')      // Quita saltos de línea.
      .replace(new RegExp('"', 'g'), "'")           // Cambia comillas dobles a simples (vital para JSON).
      .replace(new RegExp('\\\\', 'g'), '\\\\')      // Escapa las barras invertidas.
      .trim();
  }

  const formattedResults = results.map((result, index) => {
    const title = cleanText(result.title || 'Sin Título');
    const content = cleanText(result.content);
    const url = result.url || '#';
    
    // Formato Markdown para que el chatbot lo renderice mejor.
    return `### Fuente [${index + 1}]: ${title}\n${content}\n**URL:** ${url}`;
  }).join('\n\n---\n\n');

  let responseText = '';

  if (answer) {
    responseText += `**Respuesta Directa (Tavily):**\n${cleanText(answer)}\n\n`;
  }

  if (formattedResults.length > 0) {
    responseText += `**Resultados de Búsqueda:**\n\n${formattedResults}`;
  } else if (!answer) {
    responseText += "No se encontraron resultados relevantes.";
  }

  return {
    response: responseText,
    status: 'success'
  };
}
