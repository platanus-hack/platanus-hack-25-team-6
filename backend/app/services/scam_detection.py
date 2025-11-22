from anthropic import AsyncAnthropic
from ..core.config import get_settings
from ..schemas.recording import ScamAnalysis
from ..models.recording import ScamRiskLevel
import json

settings = get_settings()


class ScamDetectionService:
    def __init__(self):
        self.client = AsyncAnthropic(api_key=settings.anthropic_api_key)

    async def analyze_conversation(self, transcript: str) -> ScamAnalysis:
        """
        Analyze conversation transcript for scam indicators using Claude

        Args:
            transcript: Conversation transcript text

        Returns:
            ScamAnalysis object with detection results
        """
        system_prompt = """You are an expert fraud detection AI specialized in identifying phone scams and fraudulent calls.

Analyze the following phone conversation transcript and determine if it's a scam or legitimate call.

Common scam indicators include:
- Urgency tactics (immediate action required, limited time offers)
- Requests for personal information (SSN, bank details, passwords)
- Requests for payment via gift cards, wire transfers, cryptocurrency
- Impersonation of government agencies (IRS, Social Security, police)
- Tech support scams claiming computer issues
- Prize/lottery scams asking for fees to claim winnings
- Threats of legal action or arrest
- Requests to keep the call secret from family
- Pressure to make immediate decisions
- Too-good-to-be-true offers

Return your analysis in JSON format with:
{
  "is_scam": boolean,
  "risk_level": "low" | "medium" | "high" | "critical",
  "confidence": float (0-1),
  "indicators": [list of specific scam indicators found],
  "reasoning": "detailed explanation of your analysis",
  "recommended_actions": [list of actions the user should take]
}"""

        try:
            response = await self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=2000,
                temperature=0.3,
                system=system_prompt,
                messages=[
                    {
                        "role": "user",
                        "content": f"Analyze this phone conversation:\n\n{transcript}"
                    }
                ]
            )

            # Parse Claude's response
            analysis_text = response.content[0].text

            # Extract JSON from response
            try:
                # Try to find JSON in the response
                start_idx = analysis_text.find('{')
                end_idx = analysis_text.rfind('}') + 1
                if start_idx >= 0 and end_idx > start_idx:
                    json_str = analysis_text[start_idx:end_idx]
                    analysis_data = json.loads(json_str)
                else:
                    # Fallback if no JSON found
                    analysis_data = self._parse_text_response(analysis_text)
            except json.JSONDecodeError:
                analysis_data = self._parse_text_response(analysis_text)

            return ScamAnalysis(
                is_scam=analysis_data.get("is_scam", False),
                risk_level=ScamRiskLevel(analysis_data.get("risk_level", "low")),
                confidence=float(analysis_data.get("confidence", 0.0)),
                indicators=analysis_data.get("indicators", []),
                reasoning=analysis_data.get("reasoning", ""),
                recommended_actions=analysis_data.get("recommended_actions", [])
            )

        except Exception as e:
            print(f"Scam detection error: {str(e)}")
            raise Exception(f"Failed to analyze conversation: {str(e)}")

    def _parse_text_response(self, text: str) -> dict:
        """Fallback parser for non-JSON responses"""
        return {
            "is_scam": "scam" in text.lower() or "fraud" in text.lower(),
            "risk_level": "medium",
            "confidence": 0.5,
            "indicators": [],
            "reasoning": text,
            "recommended_actions": ["Review the full transcript carefully"]
        }


scam_detection_service = ScamDetectionService()
