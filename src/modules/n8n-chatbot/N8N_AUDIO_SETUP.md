# Configuración de N8N para Transcripción de Audio

## Resumen
Este documento explica cómo configurar el workflow de n8n para recibir audio del frontend y devolverlo transcrito usando OpenAI Whisper.

## Workflow de n8n (3 Nodos)

### 1. Webhook (Trigger)
**Configuración:**
- **HTTP Method:** POST
- **Path:** `/webhook/audio-transcriber` (o el path que prefieras)
- **Authentication:** None (o Header Auth si lo prefieres)
- **Response Mode:** When Last Node Finishes
- **Important:** En las opciones del webhook, asegúrate de que:
  - Binary Data esté habilitado
  - El campo de archivo se llame `file` (debe coincidir con el FormData del frontend)

**Opciones avanzadas:**
```
Binary Data: ON
Binary Property: file
```

### 2. OpenAI (Whisper Transcription)
**Configuración:**
- **Resource:** Audio
- **Operation:** Transcribe
- **Model:** whisper-1
- **Binary Property:** `file` (debe coincidir con el nombre del campo del webhook)
- **Language:** (opcional) `es` para español
- **Temperature:** 0 (para máxima precisión)

**Expresión del Binary Property:**
```javascript
{{ $binary.file }}
```

### 3. Respond to Webhook
**Configuración:**
- **Respond With:** JSON
- **Response Body:**
```json
{
  "text": "{{ $json.text }}",
  "status": "success"
}
```

**Expresión completa:**
```javascript
{
  "text": "{{ $json.text }}",
  "status": "success",
  "duration": "{{ $json.duration }}"
}
```

## Estructura del Response

El frontend espera recibir un JSON con esta estructura:
```json
{
  "text": "La transcripción del audio aquí",
  "status": "success"
}
```

Alternativamente, también acepta:
```json
{
  "transcription": "La transcripción del audio aquí"
}
```

## Testing del Workflow

### Con cURL:
```bash
curl -X POST https://n8nsystems.info/webhook/audio-transcriber \
  -F "file=@/path/to/audio.wav"
```

### Respuesta esperada:
```json
{
  "text": "Hola, esta es una prueba de transcripción",
  "status": "success"
}
```

## Manejo de Errores

Si hay un error en la transcripción, n8n debería devolver:
```json
{
  "error": "Mensaje de error",
  "status": "error"
}
```

El frontend ya maneja estos errores y muestra un alert al usuario.

## Formatos de Audio Soportados

Whisper acepta los siguientes formatos:
- mp3
- mp4
- mpeg
- mpga
- m4a
- wav
- webm (✅ Este es el que usa el frontend por defecto)
- ogg

## Optimizaciones Recomendadas

### 1. Agregar validación de tamaño
Agrega un nodo "IF" antes de OpenAI para validar que el archivo no sea muy grande:
```javascript
{{ $binary.file.fileSize < 25000000 }} // 25MB max
```

### 2. Agregar timeout
En la configuración del nodo OpenAI, ajusta el timeout a 60 segundos para archivos largos.

### 3. Agregar logging
Inserta un nodo "Code" después del Webhook para registrar:
```javascript
console.log('Audio recibido:', {
  size: $binary.file.fileSize,
  mimeType: $binary.file.mimeType,
  timestamp: new Date()
});

return items;
```

## Troubleshooting

### El webhook no recibe el archivo
- Verifica que "Binary Data" esté habilitado en el webhook
- Confirma que el campo se llame exactamente `file`
- Revisa los logs de n8n

### Whisper falla al transcribir
- Verifica que el formato del audio sea compatible
- Confirma que el archivo no supere 25MB
- Prueba con `temperature: 0` para mejor precisión

### El frontend no recibe la transcripción
- Verifica que el response tenga el campo `text` o `transcription`
- Revisa la consola del navegador para ver el response exacto
- Confirma que el CORS esté habilitado en n8n

## Variables de Entorno Requeridas

En tu archivo `.env.local`:
```bash
NEXT_PUBLIC_N8N_AUDIO_WEBHOOK_URL=https://n8nsystems.info/webhook/audio-transcriber
```

## Ejemplo de Flujo Completo

1. Usuario presiona botón de micrófono en el chat
2. El navegador graba audio usando MediaRecorder API
3. Al soltar el botón, se genera un Blob de audio en formato webm
4. El frontend convierte el Blob a FormData
5. Se envía POST a n8n con el audio
6. N8N recibe el audio y lo pasa a Whisper
7. Whisper transcribe y devuelve el texto
8. N8N devuelve JSON con la transcripción
9. El frontend inserta el texto en el input del chat
10. El usuario puede editarlo antes de enviar

## Performance

- **Tiempo promedio:** 2-4 segundos para audios de 10 segundos
- **Cold start:** Primera llamada puede tardar 5-7 segundos
- **Latencia de red:** Depende de la ubicación del servidor de n8n

## Mejoras Futuras

1. **Web Speech API:** Para latencia cero, considera usar `window.webkitSpeechRecognition` en el navegador
2. **Chunking:** Para audios largos, dividir en chunks de 30 segundos
3. **Compression:** Comprimir el audio antes de enviar para reducir tiempo de upload
4. **Feedback visual:** Mostrar waveform durante la grabación
5. **Retry logic:** Reintentar automáticamente si falla la transcripción
