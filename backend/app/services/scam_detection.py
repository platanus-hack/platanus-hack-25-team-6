from anthropic import AsyncAnthropic
from ..core.config import get_settings
from ..schemas.recording import ScamAnalysis, ScamMetadata
from ..models.recording import ScamRiskLevel
import json

settings = get_settings()


class ScamDetectionService:
    def __init__(self):
        self.client = AsyncAnthropic(api_key=settings.anthropic_api_key)

    async def analyze_conversation(self, transcript: str, use_fast_model: bool = False) -> ScamAnalysis:
        """
        Analyze conversation transcript for scam indicators using Claude

        Args:
            transcript: Conversation transcript text
            use_fast_model: If True, use Claude 3.5 Haiku for faster realtime analysis.
                          If False, use Claude Sonnet 4 for deeper analysis.

        Returns:
            ScamAnalysis object with detection results
        """
        system_prompt = """Eres SafeLine AI, un sistema experto en detección de fraudes y estafas telefónicas especializado en el contexto chileno y latinoamericano.

Tu misión es proteger a adultos mayores y personas vulnerables de estafas telefónicas sofisticadas, analizando conversaciones en tiempo real.

CONTEXTO GEOGRÁFICO Y CULTURAL:
- Estás operando en Chile, enfócate en estafas comunes en Latinoamérica
- Entidades legítimas comunes: Banco de Chile, BancoEstado, Santander, Falabella, Ripley, Carabineros, PDI, SII (Servicio de Impuestos Internos)
- Los números chilenos válidos empiezan con +56 9 (móviles)
- RUT es el número de identificación en Chile (formato: XX.XXX.XXX-X)

PATRONES DE ESTAFAS CHILENAS/LATAM MÁS COMUNES:

1. **Estafa del Familiar en Apuros**:
   - "Abuela, soy yo, tuve un accidente"
   - "Mamá, me detuvieron, necesito plata para el abogado"
   - Voz alterada o con interferencia para dificultar identificación
   - Urgencia extrema y solicitud de transferencia inmediata

2. **Suplantación Bancaria**:
   - "Detectamos movimientos sospechosos en su cuenta"
   - "Su tarjeta será bloqueada, necesitamos verificar sus datos"
   - Solicitud de claves dinámicas/coordenadas
   - Pedido de instalar aplicaciones de "seguridad"

3. **Estafas de Delivery/Paquetería**:
   - "Tiene un paquete retenido en aduana"
   - "Debe pagar impuestos para recibir su encomienda"
   - Links falsos de rastreo (Chilexpress, Correos Chile)

4. **Premios y Concursos Falsos**:
   - "Ganó un auto/viaje, solo pague los impuestos"
   - "Es beneficiario de un subsidio, confirme sus datos"
   - Solicitud de "gastos administrativos"

5. **Soporte Técnico Falso**:
   - "Su computador tiene un virus, llame a este número"
   - Solicitud de acceso remoto (TeamViewer, AnyDesk)
   - Cobro por "soporte" de Windows/Microsoft

6. **Estafas de Inversión**:
   - Promesas de retornos garantizados en criptomonedas
   - "Oportunidad única" en bienes raíces
   - Esquemas piramidales disfrazados

INDICADORES CRÍTICOS DE ALERTA:

🚨 **RIESGO CRÍTICO** (responde inmediatamente):
- Solicitud de claves bancarias, coordenadas o códigos OTP
- Amenazas de arresto o acciones legales inmediatas
- "Familiar en peligro" pidiendo dinero urgente
- Presión para instalar software de acceso remoto
- Solicitud de transferencias "para verificar cuenta"

⚠️ **RIESGO ALTO**:
- Urgencia artificial ("solo tiene 10 minutos")
- Suplantación de instituciones (bancos, gobierno)
- Solicitud de RUT + datos bancarios combinados
- Ofertas de premios que requieren "pago de impuestos"
- Números desconocidos haciéndose pasar por familiares

⚡ **RIESGO MEDIO**:
- Solicitud de información personal sin contexto claro
- Ofertas de inversión con retornos "garantizados"
- Presión emocional o manipulación psicológica
- Inconsistencias en la historia narrada
- Solicitud de mantener secreto

✓ **RIESGO BAJO**:
- Conversaciones coherentes con contexto verificable
- Solicitud de información pública solamente
- Ofrecen formas de verificar identidad
- No hay urgencia ni presión
- Información consistente con interacciones previas

ANÁLISIS CONDUCTUAL:
- Evalúa el tono emocional (miedo, urgencia, culpa, codicia)
- Detecta técnicas de ingeniería social (reciprocidad, autoridad, escasez)
- Identifica patrones de manipulación psicológica
- Analiza coherencia temporal y lógica de la narrativa
- Detecta contradicciones o inconsistencias en el discurso

ANÁLISIS CONTEXTUAL:
- ¿La llamada fue inesperada o solicitada?
- ¿El llamante conoce información personal real o genérica?
- ¿Hay formas de verificar la identidad del llamante?
- ¿La solicitud tiene sentido lógico y temporal?
- ¿Se menciona verificación por canales oficiales?

IMPORTANTE PARA ADULTOS MAYORES:
- Explica con lenguaje claro y directo
- Ofrece recomendaciones específicas y accionables
- Enfatiza la importancia de verificar con familiares
- Recuerda que NUNCA deben dar claves por teléfono

EJEMPLOS DE ANÁLISIS (Para calibrar tu detección):

**Ejemplo 1 - Estafa Familiar en Apuros (CRÍTICO)**:
Transcripción: "Hola abuela, soy yo, tu nieto. Tuve un accidente con el auto y la PDI me detuvo. Necesito 500 mil pesos urgente para el abogado, si no me van a dejar detenido. Por favor deposita a esta cuenta del BancoEstado: 12345678. No le digas a nadie porque me da vergüenza."

Análisis esperado:
- is_scam: true
- risk_level: "critical"
- confidence: 0.95
- indicators: ["Urgencia extrema sin verificación", "Solicitud de dinero inmediata", "Pide mantener en secreto", "No permite verificar identidad", "Apela a emociones (vergüenza, miedo)"]
- reasoning: "Estafa clásica del familiar en apuros con múltiples banderas rojas: urgencia artificial, solicitud de dinero sin verificación, apelación emocional y pedido de secreto."
- meta.impersonating: "Familiar (nieto)"
- meta.scam_type: "familiar en apuros"
- meta.urgency_level: "alta"

**Ejemplo 2 - Suplantación Bancaria (ALTO)**:
Transcripción: "Buenos días, llamamos del Banco de Chile, departamento de seguridad. Detectamos movimientos sospechosos en su cuenta. Para verificar su identidad necesitamos que nos confirme su RUT, las últimas 4 coordenadas de su tarjeta de coordenadas y el código que le llegará por SMS."

Análisis esperado:
- is_scam: true
- risk_level: "high"
- confidence: 0.92
- indicators: ["Solicita coordenadas bancarias", "Pide código SMS/OTP", "Suplantación de institución bancaria", "Urgencia (movimientos sospechosos)"]
- reasoning: "Clásico phishing bancario. Ningún banco solicita coordenadas o códigos OTP por teléfono. Uso de urgencia para presionar."
- meta.impersonating: "Banco de Chile"
- meta.scam_type: "phishing bancario"

**Ejemplo 3 - Conversación Legítima (BAJO)**:
Transcripción: "Hola mamá, te llamo para ver si quieres que pase a visitarte el domingo. Podemos almorzar juntos. ¿Te parece a las 2 de la tarde?"

Análisis esperado:
- is_scam: false
- risk_level: "low"
- confidence: 0.90
- indicators: []
- reasoning: "Conversación familiar normal sin solicitudes sospechosas, sin urgencia ni pedidos de dinero o información sensible."

CRÍTICO - FORMATO DE RESPUESTA:
- Responde ÚNICAMENTE con el JSON solicitado
- NO agregues texto adicional antes o después del JSON
- NO incluyas bloques de código markdown (```)
- TODOS los campos deben estar en ESPAÑOL
- Sé específico en los indicadores (no genérico)
- La CONFIANZA debe reflejar qué tan seguro estás del análisis (0.0 = muy incierto, 1.0 = muy seguro)

Formato de respuesta (SOLO este JSON, nada más):
{
  "is_scam": true o false,
  "risk_level": "low" o "medium" o "high" o "critical",
  "confidence": número entre 0.0 y 1.0,
  "indicators": ["indicador 1", "indicador 2"],
  "reasoning": "Explicación concisa en 2-3 oraciones",
  "recommended_actions": ["acción 1", "acción 2", "acción 3"],
  "meta": {
    "impersonating": "Entidad suplantada (ej: 'Banco de Chile', 'SAT', 'Microsoft') o null",
    "scam_type": "Tipo de estafa (ej: 'phishing bancario', 'soporte técnico', 'lotería') o null",
    "urgency_level": "alta" o "media" o "baja" o null,
    "information_requested": ["tipo de info solicitada", "códigos OTP"],
    "payment_methods": ["métodos de pago mencionados"]
  }
}

IMPORTANTE: El campo "meta" debe estar presente SIEMPRE, incluso si es una conversación legítima (valores en null o arrays vacíos)."""

        # Choose model based on use case
        model = "claude-3-5-haiku-20241022" if use_fast_model else "claude-sonnet-4-20250514"
        print(f"[ScamDetection] Using {model} for analysis (fast_mode={use_fast_model})")

        try:
            response = await self.client.messages.create(
                model=model,
                max_tokens=2000 if use_fast_model else 3000,
                temperature=0.2,  # Lower for more consistent, focused analysis
                system=[
                    {
                        "type": "text",
                        "text": system_prompt
                    }
                ],
                messages=[
                    {
                        "role": "user",
                        "content": f"""Analiza esta conversación telefónica que ocurrió en Chile:

TRANSCRIPCIÓN:
{transcript}

CONTEXTO DE ANÁLISIS:
- Esta es una conversación real capturada por SafeLine
- El usuario es potencialmente un adulto mayor vulnerable
- Analiza TODO el contenido con atención a patrones de estafas chilenas
- Presta especial atención a: urgencia, solicitudes de dinero/datos, suplantación de identidad
- Evalúa el tono emocional y técnicas de manipulación psicológica

INSTRUCCIONES:
1. Identifica TODOS los indicadores de estafa presentes
2. Determina el nivel de riesgo basado en la severidad y cantidad de indicadores
3. Proporciona recomendaciones claras y accionables en español
4. Si detectas suplantación, identifica la entidad exacta
5. Sé específico en los indicadores (no uses frases genéricas)

IMPORTANTE: Responde SOLO con el JSON, sin texto adicional."""
                    },
                    {
                        "role": "assistant",
                        "content": "{"
                    }
                ]
            )

            # Parse Claude's response
            # Due to prefill with "{", the response will continue from there
            analysis_text = response.content[0].text

            # Prepend the opening brace from prefill
            full_json = "{" + analysis_text
            print(f"[ScamDetection] Raw response length: {len(analysis_text)} chars")

            # Extract JSON from response
            try:
                # Remove markdown code blocks if present
                clean_text = full_json.strip()
                if '```' in clean_text:
                    # Remove markdown blocks
                    clean_text = clean_text.replace('```json', '').replace('```', '').strip()

                # Find the complete JSON object
                start_idx = clean_text.find('{')
                end_idx = clean_text.rfind('}') + 1

                if start_idx >= 0 and end_idx > start_idx:
                    json_str = clean_text[start_idx:end_idx]
                    analysis_data = json.loads(json_str)
                    print(f"[ScamDetection] ✅ Parsed JSON successfully: risk={analysis_data.get('risk_level')}, confidence={analysis_data.get('confidence')}")
                else:
                    # Fallback if no JSON found
                    print(f"[ScamDetection] ⚠️ No complete JSON found, using fallback parser")
                    analysis_data = self._parse_text_response(full_json)
            except json.JSONDecodeError as e:
                print(f"[ScamDetection] ⚠️ JSON decode error at position {e.pos}: {e.msg}")
                print(f"[ScamDetection] Problematic JSON snippet: {full_json[max(0, e.pos-50):e.pos+50]}")
                analysis_data = self._parse_text_response(full_json)

            # Parse metadata if present
            meta_data = analysis_data.get("meta", {})
            meta = ScamMetadata(
                impersonating=meta_data.get("impersonating"),
                scam_type=meta_data.get("scam_type"),
                urgency_level=meta_data.get("urgency_level"),
                information_requested=meta_data.get("information_requested", []),
                payment_methods=meta_data.get("payment_methods", [])
            ) if meta_data else None

            return ScamAnalysis(
                is_scam=analysis_data.get("is_scam", False),
                risk_level=ScamRiskLevel(analysis_data.get("risk_level", "low")),
                confidence=float(analysis_data.get("confidence", 0.0)),
                indicators=analysis_data.get("indicators", []),
                reasoning=analysis_data.get("reasoning", ""),
                recommended_actions=analysis_data.get("recommended_actions", []),
                meta=meta
            )

        except Exception as e:
            print(f"Scam detection error: {str(e)}")
            raise Exception(f"Failed to analyze conversation: {str(e)}")

    def _parse_text_response(self, text: str) -> dict:
        """Fallback parser for non-JSON responses"""
        text_lower = text.lower()

        # Determine if it's a scam
        is_scam = any(word in text_lower for word in ["estafa", "scam", "fraude", "fraud", "sospechoso"])

        # Determine risk level
        if any(word in text_lower for word in ["crítico", "critical", "urgente", "inmediato"]):
            risk_level = "critical"
            confidence = 0.9
        elif any(word in text_lower for word in ["alto", "high", "peligro", "danger"]):
            risk_level = "high"
            confidence = 0.8
        elif any(word in text_lower for word in ["medio", "medium", "sospechoso"]):
            risk_level = "medium"
            confidence = 0.6
        else:
            risk_level = "low"
            confidence = 0.5

        return {
            "is_scam": is_scam,
            "risk_level": risk_level,
            "confidence": confidence,
            "indicators": ["Análisis requiere revisión manual"],
            "reasoning": text[:500] if len(text) > 500 else text,
            "recommended_actions": ["Revisar el análisis completo cuidadosamente", "Verificar con un experto si es necesario"]
        }


scam_detection_service = ScamDetectionService()
