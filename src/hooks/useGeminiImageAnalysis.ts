// src/hooks/useGeminiImageAnalysis.ts
import { useCallback, useState } from 'react';
import { getGenerativeModel, HarmCategory, HarmBlockThreshold } from '@firebase/ai';
import { ai } from '@/lib/firebase';
import useGeminiStore from '@/stores/geminiStore';

export interface ImageAnalysisResult {
  description: string;
  tags: string[];
  confidence: number;
  timestamp: number;
}

export const useGeminiImageAnalysis = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastResult, setLastResult] = useState<ImageAnalysisResult | null>(null);
  const { addQuery, setProcessing } = useGeminiStore();

  const analyzeImage = useCallback(async (
    imageUrl: string,
    prompt?: string,
    taskId?: string
  ): Promise<ImageAnalysisResult | null> => {
    if (!imageUrl) {
      console.error('[useGeminiImageAnalysis] No image URL provided');
      return null;
    }

    setIsAnalyzing(true);
    setProcessing(true);

    try {
      const model = getGenerativeModel(ai, {
        model: 'gemini-1.5-flash',
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.4,
        },
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
        ],
      });

      const defaultPrompt = prompt || 'Analiza esta imagen y proporciona una descripción detallada, etiquetas relevantes y un nivel de confianza en tu análisis.';
      
      const result = await model.generateContent([
        defaultPrompt,
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: imageUrl
          }
        }
      ]);

      const response = result.response;
      const text = response.text();

      // Parsear la respuesta para extraer información estructurada
      const analysis: ImageAnalysisResult = {
        description: text,
        tags: extractTags(text),
        confidence: extractConfidence(text),
        timestamp: Date.now()
      };

      setLastResult(analysis);

      // Guardar en el store si hay taskId
      if (taskId) {
        addQuery(taskId, `Image Analysis: ${prompt || 'Default analysis'}`, text);
      }

      return analysis;

    } catch (error) {
      console.error('[useGeminiImageAnalysis] Error analyzing image:', error);
      
      // Fallback: análisis básico
      const fallbackAnalysis: ImageAnalysisResult = {
        description: 'No se pudo analizar la imagen. Error en el procesamiento.',
        tags: ['error', 'fallback'],
        confidence: 0,
        timestamp: Date.now()
      };

      setLastResult(fallbackAnalysis);
      return fallbackAnalysis;

    } finally {
      setIsAnalyzing(false);
      setProcessing(false);
    }
  }, [addQuery, setProcessing]);

  const extractTags = useCallback((text: string): string[] => {
    // Extraer etiquetas del texto de respuesta
    const tagPatterns = [
      /etiquetas?[:\s]+([^.\n]+)/i,
      /tags?[:\s]+([^.\n]+)/i,
      /palabras? clave[:\s]+([^.\n]+)/i,
      /keywords?[:\s]+([^.\n]+)/i
    ];

    for (const pattern of tagPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1]
          .split(/[,;]/)
          .map(tag => tag.trim())
          .filter(tag => tag.length > 0)
          .slice(0, 10); // Máximo 10 tags
      }
    }

    // Fallback: extraer palabras clave del texto
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 5);

    return words;
  }, []);

  const extractConfidence = useCallback((text: string): number => {
    // Extraer nivel de confianza del texto
    const confidencePatterns = [
      /confianza[:\s]+(\d+)%/i,
      /confidence[:\s]+(\d+)%/i,
      /certeza[:\s]+(\d+)%/i,
      /certainty[:\s]+(\d+)%/i
    ];

    for (const pattern of confidencePatterns) {
      const match = text.match(pattern);
      if (match) {
        const confidence = parseInt(match[1]);
        return Math.min(Math.max(confidence, 0), 100) / 100; // Normalizar a 0-1
      }
    }

    // Fallback: confianza media
    return 0.7;
  }, []);

  const clearResult = useCallback(() => {
    setLastResult(null);
  }, []);

  return {
    analyzeImage,
    isAnalyzing,
    lastResult,
    clearResult,
  };
};
