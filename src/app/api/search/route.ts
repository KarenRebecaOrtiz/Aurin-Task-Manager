import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  
  if (!query) {
    return NextResponse.json({ error: 'Missing query parameter' }, { status: 400 });
  }
  
  try {
    // Usar Serper API para búsqueda web (gratis)
    const apiKey = process.env.SERPER_API_KEY || 'demo-key'; // Agregar a .env
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 
        'X-API-KEY': apiKey, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ q: query }),
    });
    
    if (!response.ok) {
      throw new Error(`Search API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Parsear resultados (top 3 snippets)
    const snippets = data.organic?.slice(0, 3).map((result: { title: string; snippet: string; link: string }) => ({
      title: result.title,
      snippet: result.snippet,
      link: result.link,
    })) || [];
    
    console.log('[Search API] Results for:', query, snippets.length);
    
    return NextResponse.json({ snippets });
  } catch (error) {
    console.error('[Search API] Error:', error);
    
    // Fallback a resultados simulados si la API falla
    const fallbackSnippets = [
      {
        title: 'Resultado de búsqueda',
        snippet: `Información sobre: ${query}. Este es un resultado de respaldo mientras se resuelve el problema de conexión.`,
        link: '#'
      }
    ];
    
    return NextResponse.json({ 
      snippets: fallbackSnippets,
      error: 'Search API unavailable, using fallback'
    });
  }
} 