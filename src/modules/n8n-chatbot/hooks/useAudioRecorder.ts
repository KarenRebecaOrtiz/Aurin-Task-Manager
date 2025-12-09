'use client'

import { useState, useEffect, useCallback } from 'react'

export interface UseAudioRecorderOptions {
  onTranscription: (text: string) => void
  onError?: (error: string) => void
}

export interface UseAudioRecorderReturn {
  isRecording: boolean
  isProcessing: boolean
  startRecording: () => void
  stopRecording: () => void
  audioTime: number
}

/**
 * Hook para grabar audio y transcribirlo usando n8n + Whisper
 */
export function useAudioRecorder({
  onTranscription,
  onError
}: UseAudioRecorderOptions): UseAudioRecorderReturn {
  const [isProcessing, setIsProcessing] = useState(false)
  const [audioTime, setAudioTime] = useState(0)
  const [status, setStatus] = useState<'idle' | 'recording' | 'stopped'>('idle')
  const [mediaBlobUrl, setMediaBlobUrl] = useState<string | null>(null)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [audioChunks, setAudioChunks] = useState<Blob[]>([])

  // Inicializar MediaRecorder manualmente en el cliente
  const startMediaRecording = useCallback(async () => {
    try {
      // Solicitar acceso al micrófono con configuración óptima
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true,
          sampleRate: 48000,
        }
      })

      // Determinar el mejor mimeType soportado
      let mimeType = 'audio/webm;codecs=opus'
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm'
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/mp4'
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = ''
      }

      const recorder = new MediaRecorder(stream, {
        mimeType: mimeType || undefined,
        audioBitsPerSecond: 128000 // 128 kbps para buena calidad
      })

      const chunks: Blob[] = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data)
        }
      }

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType || 'audio/webm' })
        const url = URL.createObjectURL(blob)
        setMediaBlobUrl(url)
        setStatus('stopped')
        stream.getTracks().forEach(track => track.stop())
      }

      recorder.onerror = (e) => {
        console.error('Error en MediaRecorder:', e)
      }

      recorder.start(1000)

      setMediaRecorder(recorder)
      setAudioChunks(chunks)
      setStatus('recording')
    } catch (error) {
      console.error('❌ Error starting recording:', error)
      onError?.('No se pudo acceder al micrófono. Por favor, permite el acceso.')
    }
  }, [onError])

  const stopMediaRecording = useCallback(() => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop()
    }
  }, [mediaRecorder])

  // Timer para mostrar duración de grabación
  useEffect(() => {
    let intervalId: NodeJS.Timeout

    if (status === 'recording') {
      intervalId = setInterval(() => {
        setAudioTime(prev => prev + 1)
      }, 1000)
    } else {
      setAudioTime(0)
    }

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [status])

  // Cuando se genera el audio, enviarlo a n8n
  useEffect(() => {
    if (status === 'stopped' && mediaBlobUrl) {
      handleSendAudio(mediaBlobUrl)
    }
  }, [status, mediaBlobUrl])

  const handleSendAudio = async (url: string) => {
    setIsProcessing(true)

    try {
      const audioBlob = await fetch(url).then(r => r.blob())

      if (audioBlob.size < 1000) {
        throw new Error('Audio demasiado corto o vacío. Por favor, graba por más tiempo.')
      }

      const formData = new FormData()
      const extension = audioBlob.type.includes('webm') ? 'webm' :
                       audioBlob.type.includes('mp4') ? 'mp4' : 'webm'
      formData.append('file', audioBlob, `recording.${extension}`)

      const webhookUrl = process.env.NEXT_PUBLIC_N8N_AUDIO_WEBHOOK_URL

      if (!webhookUrl) {
        throw new Error('N8N_AUDIO_WEBHOOK_URL no configurada')
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`Error en transcripción: ${response.statusText}`)
      }

      const data = await response.json()

      // 4. Devolver transcripción
      if (data?.text) {
        onTranscription(data.text)
      } else if (data?.transcription) {
        // Por si n8n devuelve con otro nombre de campo
        onTranscription(data.transcription)
      } else {
        throw new Error('No se recibió texto en la respuesta')
      }

    } catch (error) {
      console.error('Error transcribiendo audio:', error)
      const errorMessage = error instanceof Error
        ? error.message
        : 'Error al transcribir audio'
      onError?.(errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }

  const startRecording = useCallback(() => {
    startMediaRecording()
  }, [startMediaRecording])

  const stopRecording = useCallback(() => {
    stopMediaRecording()
  }, [stopMediaRecording])

  return {
    isRecording: status === 'recording',
    isProcessing,
    startRecording,
    stopRecording,
    audioTime
  }
}
