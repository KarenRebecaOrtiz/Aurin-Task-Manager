'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

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

  // Refs to track current recording state without causing re-renders
  // These prevent race conditions from multiple startRecording calls
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  // Store callbacks in refs to keep useCallback dependencies stable
  const onErrorRef = useRef(onError)
  const onTranscriptionRef = useRef(onTranscription)

  // Keep refs updated with latest callbacks
  useEffect(() => {
    onErrorRef.current = onError
    onTranscriptionRef.current = onTranscription
  }, [onError, onTranscription])

  // Inicializar MediaRecorder manualmente en el cliente
  const startMediaRecording = useCallback(async () => {
    // Guard: if already recording, ignore duplicate start calls
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      console.log('⚠️ Already recording, ignoring duplicate start')
      return
    }

    // Cleanup any previous recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }

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

      // Reset chunks ref for this recording session
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' })
        const url = URL.createObjectURL(blob)
        setMediaBlobUrl(url)
        setStatus('stopped')
        // Cleanup refs
        mediaRecorderRef.current = null
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
          streamRef.current = null
        }
      }

      recorder.onerror = (e) => {
        console.error('Error en MediaRecorder:', e)
        mediaRecorderRef.current = null
      }

      recorder.start(1000)

      // Store in refs for access across callbacks
      mediaRecorderRef.current = recorder
      streamRef.current = stream

      setMediaRecorder(recorder)
      setAudioChunks(chunksRef.current)
      setStatus('recording')
    } catch (error) {
      console.error('❌ Error starting recording:', error)
      onErrorRef.current?.('No se pudo acceder al micrófono. Por favor, permite el acceso.')
    }
  }, []) // No dependencies - uses refs for callbacks and state

  const stopMediaRecording = useCallback(() => {
    // Use ref to ensure we stop the correct recorder instance
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
  }, []) // No dependencies - uses ref

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
        onTranscriptionRef.current(data.text)
      } else if (data?.transcription) {
        // Por si n8n devuelve con otro nombre de campo
        onTranscriptionRef.current(data.transcription)
      } else {
        throw new Error('No se recibió texto en la respuesta')
      }

    } catch (error) {
      console.error('Error transcribiendo audio:', error)
      const errorMessage = error instanceof Error
        ? error.message
        : 'Error al transcribir audio'
      onErrorRef.current?.(errorMessage)
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
