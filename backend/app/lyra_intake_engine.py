from __future__ import annotations

import json
import os
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from .agents import TEMPLATE_CATALOG, normalize_template_id, split_items
from .models import ProjectState, SupportedLanguage

try:
    from openai import AsyncOpenAI
except Exception:  # pragma: no cover - dependency may be absent in local dev
    AsyncOpenAI = None  # type: ignore[assignment]


FieldSource = Literal["explicit", "inferred", "default"]
BusinessModel = Literal[
    "online_store",
    "marketplace",
    "service",
    "booking",
    "restaurant",
    "informational",
    "premium_product",
]
CommerceMode = Literal["single_vendor", "multi_vendor", "no_commerce"]
SalesFlow = Literal["online_sales", "quote_request", "booking", "lead_capture", "informational"]


class FieldMeta(BaseModel):
    model_config = ConfigDict(extra="ignore")

    source: FieldSource = "inferred"
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)


class TrackedField(BaseModel):
    model_config = ConfigDict(extra="ignore")

    value: Any = None
    source: FieldSource = "inferred"
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)


class DetectedIntent(BaseModel):
    model_config = ConfigDict(extra="ignore")

    businessModel: BusinessModel = "informational"
    commerceMode: CommerceMode = "no_commerce"
    salesFlow: SalesFlow = "informational"
    niche: str = "general business"
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)


class TemplateRecommendation(BaseModel):
    model_config = ConfigDict(extra="ignore")

    templateId: str = ""
    reason: str = ""

    @field_validator("templateId", mode="before")
    @classmethod
    def template_must_exist(cls, value: str) -> str:
        template_id = normalize_template_id(str(value or ""))
        if template_id and template_id not in TEMPLATE_CATALOG:
            return ""
        return template_id


class LyraIntakeDecision(BaseModel):
    model_config = ConfigDict(extra="ignore")

    updatedState: Dict[str, Any] = Field(default_factory=dict)
    fieldMeta: Dict[str, FieldMeta] = Field(default_factory=dict)
    detectedIntent: DetectedIntent = Field(default_factory=DetectedIntent)
    missingCriticalFields: List[str] = Field(default_factory=list)
    reasoning: str = ""
    nextQuestion: Optional[str] = None
    canGenerate: bool = False
    templateRecommendation: Optional[TemplateRecommendation] = None
    usedAI: bool = False
    warning: Optional[str] = None


INTAKE_STATE_FIELDS = {
    "websiteIntent",
    "businessName",
    "businessDescription",
    "industry",
    "location",
    "servicesProducts",
    "targetAudience",
    "preferredTone",
    "preferredColors",
    "contactInfo",
    "logoUrl",
    "photoUrls",
    "websiteType",
    "selectedTemplateId",
    "selectedTemplateName",
    "catalogType",
    "salesFlow",
}


BUSINESS_MODEL_TO_WEBSITE_TYPE = {
    "online_store": "online_store",
    "marketplace": "marketplace",
    "service": "services",
    "booking": "booking",
    "restaurant": "restaurant",
    "informational": "corporate",
    "premium_product": "premium_product",
}


class LyraIntakeEngine:
    """Single intake decision layer for Lyra.

    This module owns conversational understanding. It returns state updates,
    missing fields, and template recommendation. It does not render pages and
    does not generate emergency placeholder websites.
    """

    def __init__(self) -> None:
        self.model = os.getenv("OPENAI_INTAKE_MODEL") or os.getenv("OPENAI_MODEL") or "gpt-4o"
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.client = AsyncOpenAI(api_key=self.api_key) if AsyncOpenAI and self.api_key else None

    async def run(
        self,
        *,
        message: str,
        state: ProjectState,
        conversation_history: Optional[List[Dict[str, Any]]] = None,
        selected_language: SupportedLanguage = "en",
    ) -> LyraIntakeDecision:
        if not self.client:
            return self._local_unavailable_decision(state, selected_language)

        payload = {
            "message": message,
            "currentState": self._state_payload(state),
            "conversationHistory": self._compact_history(conversation_history or []),
            "selectedLanguage": selected_language,
            "availableTemplates": self._template_catalog_payload(),
            "criticalFieldPolicy": {
                "minimumToGenerate": [
                    "websiteIntent or salesFlow or websiteType",
                    "businessName",
                    "businessDescription or servicesProducts",
                ],
                "doNotRepeatWhenConfidenceAtLeast": 0.7,
                "askOneQuestionOnly": True,
            },
        }

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                temperature=0.1,
                messages=[
                    {"role": "system", "content": self._system_prompt()},
                    {"role": "user", "content": json.dumps(payload, ensure_ascii=False)},
                ],
                tools=[self._update_intake_tool()],
                tool_choice={"type": "function", "function": {"name": "update_intake"}},
            )
            tool_calls = response.choices[0].message.tool_calls or []
            if not tool_calls:
                return self._local_error_decision(state, selected_language, "Lyra did not call update_intake.")
            arguments = tool_calls[0].function.arguments or "{}"
            parsed = json.loads(arguments)
            decision = self._decision_from_tool_payload(parsed, state)
            decision.usedAI = True
            return decision
        except Exception as error:
            return self._local_error_decision(state, selected_language, str(error))

    def apply_decision(self, state: ProjectState, decision: LyraIntakeDecision) -> ProjectState:
        updates = dict(decision.updatedState)
        recommendation = decision.templateRecommendation
        if recommendation and recommendation.templateId:
            template = TEMPLATE_CATALOG.get(recommendation.templateId)
            if template:
                updates.setdefault("selectedTemplateId", recommendation.templateId)
                updates.setdefault("selectedTemplateName", template["name"])
                updates.setdefault("catalogType", template["catalogType"])
                updates.setdefault("websiteType", template["websiteType"])

        intent = decision.detectedIntent
        updates.setdefault("salesFlow", intent.salesFlow)
        updates.setdefault("websiteType", BUSINESS_MODEL_TO_WEBSITE_TYPE.get(intent.businessModel))
        updates["missingImportantFields"] = decision.missingCriticalFields

        state.update_safe(self._normalize_updates(updates))
        existing_meta = dict(state.fieldMeta or {})
        for key, meta in decision.fieldMeta.items():
            existing_meta[key] = meta.model_dump()
        state.fieldMeta = existing_meta
        return state

    def _decision_from_tool_payload(self, payload: Dict[str, Any], state: ProjectState) -> LyraIntakeDecision:
        tracked_fields = payload.get("updatedFields") if isinstance(payload.get("updatedFields"), dict) else {}
        updated_state: Dict[str, Any] = {}
        field_meta: Dict[str, FieldMeta] = {}

        for key, raw in tracked_fields.items():
            if key not in INTAKE_STATE_FIELDS or not isinstance(raw, dict):
                continue
            tracked = TrackedField.model_validate(raw)
            if tracked.value is None or tracked.value == "":
                continue
            updated_state[key] = tracked.value
            field_meta[key] = FieldMeta(source=tracked.source, confidence=tracked.confidence)

        detected_intent = DetectedIntent.model_validate(payload.get("detectedIntent") or {})
        recommendation = None
        if isinstance(payload.get("templateRecommendation"), dict):
            recommendation = TemplateRecommendation.model_validate(payload["templateRecommendation"])

        missing = [str(item) for item in payload.get("missingCriticalFields") or [] if str(item).strip()]
        can_generate = bool(payload.get("canGenerate"))
        if can_generate:
            missing = []
        elif not missing:
            missing = self._missing_fields_from_state(state, updated_state)

        return LyraIntakeDecision(
            updatedState=updated_state,
            fieldMeta=field_meta,
            detectedIntent=detected_intent,
            missingCriticalFields=missing,
            reasoning=str(payload.get("reasoning") or ""),
            nextQuestion=payload.get("nextQuestion") or None,
            canGenerate=can_generate,
            templateRecommendation=recommendation,
        )

    def _normalize_updates(self, updates: Dict[str, Any]) -> Dict[str, Any]:
        normalized = dict(updates)
        if "servicesProducts" in normalized:
            normalized["servicesProducts"] = split_items(normalized["servicesProducts"])
        if "preferredColors" in normalized and isinstance(normalized["preferredColors"], list):
            normalized["preferredColors"] = ", ".join(str(item).strip() for item in normalized["preferredColors"] if str(item).strip())
        if "photoUrls" in normalized and not isinstance(normalized["photoUrls"], list):
            normalized["photoUrls"] = split_items(normalized["photoUrls"])
        if "contactInfo" in normalized and not isinstance(normalized["contactInfo"], dict):
            normalized.pop("contactInfo", None)
        return normalized

    def _state_payload(self, state: ProjectState) -> Dict[str, Any]:
        return {
            "websiteIntent": state.websiteIntent,
            "businessName": state.businessName,
            "businessDescription": state.businessDescription,
            "industry": state.industry,
            "location": state.location,
            "servicesProducts": state.servicesProducts,
            "targetAudience": state.targetAudience,
            "preferredTone": state.preferredTone,
            "preferredColors": state.preferredColors,
            "contactInfo": state.contactInfo,
            "logoUrl": state.logoUrl,
            "photoUrls": state.photoUrls,
            "websiteType": state.websiteType,
            "selectedTemplateId": state.selectedTemplateId,
            "selectedTemplateName": state.selectedTemplateName,
            "catalogType": state.catalogType,
            "salesFlow": state.salesFlow,
            "fieldMeta": state.fieldMeta,
        }

    def _compact_history(self, history: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        compact = []
        for item in history[-8:]:
            role = str(item.get("role") or item.get("type") or "").strip()[:20]
            content = str(item.get("content") or item.get("message") or "").strip()[:700]
            if role and content:
                compact.append({"role": role, "content": content})
        return compact

    def _template_catalog_payload(self) -> List[Dict[str, Any]]:
        return [
            {
                "templateId": template_id,
                "name": data["name"],
                "websiteType": data["websiteType"],
                "catalogType": data["catalogType"],
                "bestFor": data["audience"],
            }
            for template_id, data in TEMPLATE_CATALOG.items()
        ]

    def _missing_fields_from_state(self, state: ProjectState, updates: Dict[str, Any]) -> List[str]:
        merged = {**self._state_payload(state), **updates}
        missing = []
        if not (merged.get("websiteIntent") or merged.get("salesFlow") or merged.get("websiteType")):
            missing.append("websiteIntent")
        if not merged.get("businessName"):
            missing.append("businessName")
        if not (merged.get("businessDescription") or split_items(merged.get("servicesProducts"))):
            missing.append("businessDescription")
        return missing

    def _local_unavailable_decision(self, state: ProjectState, language: SupportedLanguage) -> LyraIntakeDecision:
        missing = self._missing_fields_from_state(state, {})
        return LyraIntakeDecision(
            missingCriticalFields=missing,
            nextQuestion=self._fallback_question(missing, language),
            canGenerate=False,
            warning="OPENAI_API_KEY missing or OpenAI SDK unavailable",
        )

    def _local_error_decision(self, state: ProjectState, language: SupportedLanguage, warning: str) -> LyraIntakeDecision:
        missing = self._missing_fields_from_state(state, {})
        return LyraIntakeDecision(
            missingCriticalFields=missing,
            nextQuestion=self._fallback_question(missing, language),
            canGenerate=False,
            warning=warning,
        )

    def _fallback_question(self, missing: List[str], language: SupportedLanguage) -> str:
        if language == "es":
            if "websiteIntent" in missing:
                return "No pude procesarlo bien. Dime en una frase si quieres vender online, mostrar catalogo, recibir cotizaciones, reservas o presentar una empresa."
            if "businessName" in missing:
                return "No pude identificar el nombre del negocio. Como se llama?"
            if "businessDescription" in missing:
                return "No pude identificar claramente que vende o hace. Escribelo en un parrafo con productos, estilo y ubicacion si aplica."
            return "No pude procesar eso bien. Puedes reformularlo en una frase mas clara?"
        if "websiteIntent" in missing:
            return "I could not process that clearly. Tell me in one sentence whether you want to sell online, show a catalog, receive quotes, take bookings, or present a company."
        if "businessName" in missing:
            return "I could not identify the business name. What is it called?"
        if "businessDescription" in missing:
            return "I could not clearly identify what it sells or does. Write one paragraph with products, style and location if relevant."
        return "I could not process that clearly. Please rephrase it in one clearer sentence."

    @staticmethod
    def _update_intake_tool() -> Dict[str, Any]:
        tracked_field_schema = {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "value": {
                    "anyOf": [
                        {"type": "string"},
                        {"type": "number"},
                        {"type": "boolean"},
                        {"type": "array", "items": {"type": "string"}},
                        {"type": "object", "additionalProperties": {"type": "string"}},
                    ]
                },
                "source": {"type": "string", "enum": ["explicit", "inferred", "default"]},
                "confidence": {"type": "number", "minimum": 0, "maximum": 1},
            },
            "required": ["value", "source", "confidence"],
        }
        return {
            "type": "function",
            "function": {
                "name": "update_intake",
                "description": "Update Lyra's intake state and decide the next single question or whether the site can be generated.",
                "parameters": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "updatedFields": {
                            "type": "object",
                            "additionalProperties": tracked_field_schema,
                        },
                        "detectedIntent": {
                            "type": "object",
                            "additionalProperties": False,
                            "properties": {
                                "businessModel": {
                                    "type": "string",
                                    "enum": [
                                        "online_store",
                                        "marketplace",
                                        "service",
                                        "booking",
                                        "restaurant",
                                        "informational",
                                        "premium_product",
                                    ],
                                },
                                "commerceMode": {
                                    "type": "string",
                                    "enum": ["single_vendor", "multi_vendor", "no_commerce"],
                                },
                                "salesFlow": {
                                    "type": "string",
                                    "enum": ["online_sales", "quote_request", "booking", "lead_capture", "informational"],
                                },
                                "niche": {"type": "string"},
                                "confidence": {"type": "number", "minimum": 0, "maximum": 1},
                            },
                            "required": ["businessModel", "commerceMode", "salesFlow", "niche", "confidence"],
                        },
                        "missingCriticalFields": {
                            "type": "array",
                            "items": {"type": "string"},
                        },
                        "reasoning": {"type": "string"},
                        "nextQuestion": {"type": ["string", "null"]},
                        "canGenerate": {"type": "boolean"},
                        "templateRecommendation": {
                            "type": ["object", "null"],
                            "additionalProperties": False,
                            "properties": {
                                "templateId": {"type": "string"},
                                "reason": {"type": "string"},
                            },
                            "required": ["templateId", "reason"],
                        },
                    },
                    "required": [
                        "updatedFields",
                        "detectedIntent",
                        "missingCriticalFields",
                        "reasoning",
                        "nextQuestion",
                        "canGenerate",
                        "templateRecommendation",
                    ],
                },
            },
        }

    @staticmethod
    def _system_prompt() -> str:
        return """
You are Lyra, a senior website designer, ecommerce strategist, and intake director for KREATON.

Your job is to understand what the client wants, whether they describe it all at once or in fragments.

Every turn:
1. Read the user's message, currentState JSON, fieldMeta, conversationHistory and selectedLanguage.
2. Update only fields supported by the message. Do not invent explicit facts.
3. Use source="explicit" when the user clearly said it.
4. Use source="inferred" when you can confidently infer it from the business type, niche, or wording.
5. Use source="default" only for safe secondary defaults.
6. Never ask again for a field that already has source explicit or inferred with confidence >= 0.7.
7. Ask exactly one nextQuestion only when a critical field is missing.
8. Critical priority: business/site type, business name, products/services, sales flow, style/colors, location, contact.
9. If the user already gave enough information in one paragraph, set canGenerate=true and stop asking minor questions.
10. Treat client notes as private strategy. Do not write public page copy here.
11. Recommend one template from availableTemplates. Choose semantically, not by keyword count.
12. Use marketplace only when the client clearly wants multiple vendors or a true marketplace. Use online_store for one owner selling many categories.
13. If the client says they do not have a logo and wants Lyra/KREATON to create one, record that preference in preferredTone or preferredColors as applicable, but do not ask them to upload a logo.
14. nextQuestion must be in selectedLanguage.

Call update_intake. Do not answer in normal prose.
""".strip()
