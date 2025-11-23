# Twilio Integration Setup Guide

Esta guía te ayudará a configurar la integración de Twilio con el Call Interceptor POC para detectar estafas en llamadas telefónicas en tiempo real.

## Requisitos Previos

- Cuenta de Twilio (crear en [twilio.com](https://www.twilio.com/try-twilio))
- Un número de teléfono Twilio
- Backend ejecutándose y accesible públicamente (usando ngrok para desarrollo)

## Paso 1: Configurar Ngrok (Para Desarrollo)

Twilio necesita acceder a tu servidor a través de una URL pública.

```bash
# Instalar ngrok (si no lo tienes)
brew install ngrok  # macOS
# o descarga desde https://ngrok.com/download

# Ejecutar ngrok apuntando al puerto del backend (8000)
ngrok http 8000
```

Ngrok te dará una URL pública como: `https://abc123.ngrok.io`

## Paso 2: Configurar Variables de Entorno

Agrega estas variables a tu archivo `.env`:

```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here 
TWILIO_PHONE_NUMBER=+1234567890
BASE_URL=https://abc123.ngrok.io  # Tu URL pública de ngrok
```

**Cómo obtener las credenciales:**

1. Ve a [Twilio Console](https://console.twilio.com/)
2. En el Dashboard, encontrarás:
   - **Account SID**: Tu identificador de cuenta
   - **Auth Token**: Haz clic en "Show" para verlo
3. Ve a **Phone Numbers** > **Manage** > **Active Numbers**
4. Selecciona tu número o compra uno nuevo

## Paso 3: Configurar el Webhook de Twilio

1. Ve a tu número de Twilio en la consola
2. Scroll hasta **Voice Configuration**
3. En **A CALL COMES IN**, configura:
   - **Configure with:** Webhooks, TwiML Bins, Functions, Studio, or Proxy
   - **URL:** `https://tu-ngrok-url.ngrok.io/api/v1/twilio/incoming-call`
   - **HTTP Method:** POST
4. Guarda los cambios

## Paso 4: Verificar la Configuración

### Test de Salud del Sistema

```bash
curl http://localhost:8000/api/v1/twilio/health
```

Deberías ver:
```json
{
  "status": "ok",
  "twilio_configured": true,
  "active_calls": 0
}
```

### Test de Llamada

1. Llama a tu número de Twilio desde tu teléfono
2. Deberías ver logs en el backend:
   ```
   📞 Incoming call from +1234567890 (SID: CAxxxx...)
   🎙️ Media stream started: CAxxxx...
   [Twilio Call CAxxxx...] Starting session...
   [Twilio Call CAxxxx...] Connected to OpenAI
   ```

3. En el frontend (pestaña "Twilio Calls"), deberías ver la llamada activa

## Paso 5: Probar la Detección de Estafas

### Escenario de Prueba

Llama a tu número Twilio y di algo como:

```
"Hola, llamamos del Banco de Chile. Hemos detectado actividad sospechosa en su cuenta.
Por favor, confirme su número de tarjeta de crédito y el código CVV para verificar su identidad.
Es urgente, debe hacerlo ahora mismo o su cuenta será bloqueada."
```

### Comportamiento Esperado

1. **Transcripción en Vivo**: Verás el texto transcrito en tiempo real
2. **Análisis Automático**: Cada 3 transcripciones, Claude analiza el contenido
3. **Alerta de Riesgo**: Si detecta una estafa:
   - Nivel de riesgo cambia a ALTO o CRÍTICO (color rojo/naranja)
   - Suena una alerta en el navegador
   - Se muestra una notificación del navegador (si están habilitadas)
   - Se guarda el análisis en la base de datos

4. **Al Finalizar la Llamada**:
   - Se realiza un análisis final completo con Claude Sonnet 4
   - Se guarda en la base de datos con toda la metadata

## Arquitectura del Flujo

```
┌─────────────────┐
│  Teléfono       │
│  del Usuario    │
└────────┬────────┘
         │ Llamada
         ▼
┌─────────────────┐
│  Número Twilio  │
│  (Voice)        │
└────────┬────────┘
         │ Webhook
         ▼
┌─────────────────────────────┐
│  Backend FastAPI            │
│  /twilio/incoming-call      │
│  Retorna TwiML con <Stream> │
└────────┬────────────────────┘
         │ WebSocket
         ▼
┌─────────────────────────────┐
│  Backend FastAPI            │
│  /twilio/media-stream       │
│                             │
│  1. Recibe audio (mulaw)    │
│  2. Convierte a PCM16       │
│  3. Envía a OpenAI          │
│  4. Recibe transcripción    │
│  5. Analiza con Claude      │
│  6. Broadcast a frontends   │
└────────┬────────────────────┘
         │ WebSocket
         ▼
┌─────────────────────────────┐
│  Frontend React             │
│  TwilioCallMonitor          │
│                             │
│  - Muestra transcripción    │
│  - Muestra nivel de riesgo  │
│  - Reproduce alertas        │
│  - Notificaciones browser   │
└─────────────────────────────┘
```

## Formato de Audio

- **Twilio envía:** 8kHz mulaw (formato telefónico)
- **OpenAI espera:** 24kHz PCM16 (formato high quality)
- **Conversión:** Se realiza automáticamente con `audioop`

## WebSocket Endpoints

### 1. Media Stream (Twilio → Backend)
```
wss://tu-url.ngrok.io/api/v1/twilio/media-stream
```
Recibe audio de Twilio y lo procesa.

### 2. Monitor (Frontend → Backend)
```
ws://localhost:8000/api/v1/twilio/monitor/{call_sid}
```
Frontend se conecta para recibir actualizaciones en tiempo real.

### 3. Active Calls (REST)
```
GET http://localhost:8000/api/v1/twilio/active-calls
```
Lista de llamadas activas.

## Eventos del WebSocket (Frontend)

El frontend recibe estos eventos:

```javascript
// 1. Estado inicial de la llamada
{
  "type": "call.state",
  "call_sid": "CAxxxx...",
  "caller_number": "+1234567890",
  "recording_id": "uuid",
  "current_risk_level": "low",
  "transcript": []
}

// 2. Nueva transcripción
{
  "type": "transcript.update",
  "role": "user",
  "text": "Hola, llamamos del banco..."
}

// 3. Análisis completado
{
  "type": "analysis.complete",
  "risk_level": "high",
  "indicators": ["Suplantación bancaria", "Solicita datos sensibles"],
  "text": "Nivel de Riesgo: ALTO\nIndicadores: ...",
  "is_danger": true
}

// 4. Llamada terminada
{
  "type": "call.stopped",
  "recording_id": "uuid"
}
```

## Alertas y Notificaciones

### Sonido de Alerta
Se reproduce automáticamente cuando `is_danger: true`:
- **MEDIO**: Beep de 500ms a 600Hz
- **ALTO/CRÍTICO**: Beep de 1000ms a 800Hz

### Vibración
Si el dispositivo lo soporta:
- **MEDIO**: [200ms, pausa 100ms, 200ms]
- **CRÍTICO**: [200ms, pausa 100ms, 200ms, pausa 100ms, 200ms]

### Notificaciones del Navegador
Se muestran automáticamente (si están habilitadas):
- **CRÍTICO**: Requiere interacción (no se cierra sola)
- **ALTO/MEDIO**: Se cierra automáticamente

## Troubleshooting

### Problema: No se reciben llamadas
- ✅ Verifica que ngrok esté corriendo
- ✅ Verifica que la URL del webhook sea correcta
- ✅ Verifica que el backend esté corriendo
- ✅ Revisa los logs de Twilio en la consola

### Problema: No se transcribe el audio
- ✅ Verifica que `OPENAI_API_KEY` esté configurada
- ✅ Revisa los logs del backend para errores de OpenAI
- ✅ Verifica que la conversión de audio funcione

### Problema: No se detectan estafas
- ✅ Verifica que `ANTHROPIC_API_KEY` esté configurada
- ✅ Habla claramente indicadores de estafa (banco, urgencia, datos personales)
- ✅ Espera a que se transcriban al menos 3 frases

### Problema: Frontend no muestra la llamada
- ✅ Verifica que la pestaña "Twilio Calls" esté seleccionada
- ✅ Abre la consola del navegador para ver errores
- ✅ Verifica que el WebSocket se conecte correctamente
- ✅ Verifica que `/active-calls` retorne la llamada

## Costos de Twilio

- **Número de teléfono:** ~$1 USD/mes
- **Llamadas entrantes:** ~$0.0085 USD/minuto
- **Media Streams:** Incluido sin costo adicional

## Próximos Pasos

1. **Producción:** Reemplazar ngrok con un servidor público (AWS, GCP, Azure)
2. **Seguridad:** Validar el header `X-Twilio-Signature`
3. **Escalabilidad:** Usar Redis para gestionar sesiones entre múltiples workers
4. **Análisis Post-Llamada:** Revisar grabaciones en la pestaña "History"

## Referencias

- [Twilio Media Streams Documentation](https://www.twilio.com/docs/voice/media-streams)
- [Twilio Media Streams WebSocket Messages](https://www.twilio.com/docs/voice/media-streams/websocket-messages)
- [OpenAI Realtime API Documentation](https://platform.openai.com/docs/guides/realtime)
- [Anthropic Claude API](https://docs.anthropic.com/)
