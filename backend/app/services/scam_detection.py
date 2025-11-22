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
        system_prompt = """Eres un sistema experto en detección de fraudes y estafas telefónicas.

Analiza la siguiente transcripción de conversación telefónica y determina si es una estafa o una llamada legítima.

Indicadores comunes de estafa incluyen:
- Tácticas de urgencia ("debe actuar ahora", "oferta por tiempo limitado")
- Solicitudes de información personal (RUT/DNI, datos bancarios, contraseñas, códigos OTP)
- Solicitudes de pago mediante tarjetas de regalo, transferencias, criptomonedas
- Suplantación de entidades bancarias, gubernamentales (SAT, AFIP, Seguridad Social, policía)
- Estafas de soporte técnico alegando problemas en el computador
- Estafas de premios/loterías pidiendo pago para reclamar
- Amenazas de acciones legales o arresto
- Solicitudes de mantener la llamada en secreto
- Presión para tomar decisiones inmediatas
- Ofertas demasiado buenas para ser verdad

CRÍTICO:
- Responde ÚNICAMENTE con el JSON solicitado
- NO agregues texto adicional antes o después del JSON
- NO incluyas bloques de código markdown (```)
- TODOS los campos deben estar en ESPAÑOL

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
                max_tokens=1500 if use_fast_model else 2000,
                temperature=0.3,
                system=[
                    {
                        "type": "text",
                        "text": system_prompt
                    }
                ],
                messages=[
                    {
                        "role": "user",
                        "content": f"Analiza esta conversación telefónica:\n\n{transcript}\n\nIMPORTANTE: Responde SOLO con el JSON, sin texto adicional."
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
