from __future__ import annotations

import json
import logging
import os
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from .agents import TEMPLATE_CATALOG, normalize_template_id, split_items
from .models import ProjectState, SupportedLanguage
from .taxonomy import NICHE_TAXONOMY_LIST, normalize_niche

logger = logging.getLogger("kreaton")

try:
    from openai import AsyncOpenAI
except Exception:  # pragma: no cover - dependency may be absent in local dev
    AsyncOpenAI = None  # type: ignore[assignment]


FieldSource = Literal[
    "explicit",
    "inferred",
    "default",
    "explicit_delegation",
    "ai_recommended",
    "explicit_user_choice",
]
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


BUSINESS_INTAKE_REQUIRED_SLOTS = (
    "business_name",
    "business_description",
    "niche",
    "sales_flow",
    "brand_style",
    "logo",
)

SLOT_FIELD_ALIASES = {
    "business_name": "businessName",
    "business_description": "businessDescription",
    "sales_flow": "salesFlow",
    "target_audience": "targetAudience",
}

VALID_BRAND_STYLE_PATHS = {"explicit_preference", "explicit_delegation"}
VALID_LOGO_PATHS = {"has_logo", "wants_generated", "explicit_skip"}
VALID_SALES_FLOWS = {"online_sales", "quote_request", "booking", "lead_capture", "informational"}


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
    niche: str = "general"
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)

    @field_validator("niche", mode="before")
    @classmethod
    def niche_must_use_closed_taxonomy(cls, value: Any) -> str:
        return normalize_niche(value)


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
    "business_name",
    "business_description",
    "niche",
    "sales_flow",
    "target_audience",
    "brand_style",
    "logo",
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
            "nicheTaxonomyList": list(NICHE_TAXONOMY_LIST),
            "businessIntakeForm": self._business_intake_payload(state),
            "criticalFieldPolicy": {
                "minimumToGenerate": [
                    "business_name",
                    "business_description",
                    "niche",
                    "sales_flow",
                    "brand_style",
                    "logo",
                ],
                "doNotRepeatWhenConfidenceAtLeast": 0.7,
                "brandStyleCannotBeInferred": True,
                "logoCannotBeInferred": True,
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
            logger.error("LyraIntakeEngine failed: %s", error, exc_info=True)
            return self._local_error_decision(state, selected_language, str(error))

    def apply_decision(self, state: ProjectState, decision: LyraIntakeDecision) -> ProjectState:
        updates = dict(decision.updatedState)
        ai_confidence = max(decision.detectedIntent.confidence or 0.0, 0.75)
        recommendation = decision.templateRecommendation
        if recommendation and recommendation.templateId:
            template = TEMPLATE_CATALOG.get(recommendation.templateId)
            if template:
                can_replace_template = self._can_replace_ai_derived(state, "selectedTemplateId")
                if can_replace_template:
                    updates["selectedTemplateId"] = recommendation.templateId
                    decision.fieldMeta["selectedTemplateId"] = FieldMeta(source="ai_recommended", confidence=ai_confidence)
                if can_replace_template and self._can_replace_ai_derived(state, "selectedTemplateName"):
                    updates["selectedTemplateName"] = template["name"]
                    decision.fieldMeta["selectedTemplateName"] = FieldMeta(source="ai_recommended", confidence=ai_confidence)
                if can_replace_template and self._can_replace_ai_derived(state, "catalogType"):
                    updates["catalogType"] = template["catalogType"]
                    decision.fieldMeta["catalogType"] = FieldMeta(source="ai_recommended", confidence=ai_confidence)
                if can_replace_template and self._can_replace_ai_derived(state, "websiteType"):
                    updates["websiteType"] = template["websiteType"]
                    decision.fieldMeta["websiteType"] = FieldMeta(source="ai_recommended", confidence=ai_confidence)

        intent = decision.detectedIntent
        if self._can_replace_ai_derived(state, "salesFlow"):
            updates["salesFlow"] = intent.salesFlow
            decision.fieldMeta["salesFlow"] = FieldMeta(source="ai_recommended", confidence=ai_confidence)
            decision.fieldMeta["sales_flow"] = FieldMeta(source="ai_recommended", confidence=ai_confidence)
        if self._can_replace_ai_derived(state, "websiteType") and not updates.get("websiteType"):
            updates["websiteType"] = BUSINESS_MODEL_TO_WEBSITE_TYPE.get(intent.businessModel)
            decision.fieldMeta["websiteType"] = FieldMeta(source="ai_recommended", confidence=ai_confidence)
        updates["missingImportantFields"] = decision.missingCriticalFields

        state.update_safe(self._normalize_updates(updates))
        existing_meta = dict(state.fieldMeta or {})
        for key, meta in decision.fieldMeta.items():
            existing_meta[key] = meta.model_dump()
        state.fieldMeta = existing_meta
        return state

    @staticmethod
    def _meta_source(state: ProjectState, key: str) -> str:
        raw = (state.fieldMeta or {}).get(key)
        if not isinstance(raw, dict):
            return ""
        return str(raw.get("source") or "")

    def _can_replace_ai_derived(self, state: ProjectState, key: str) -> bool:
        return self._meta_source(state, key) != "explicit_user_choice"

    def _decision_from_tool_payload(self, payload: Dict[str, Any], state: ProjectState) -> LyraIntakeDecision:
        tracked_fields = payload.get("updatedFields") if isinstance(payload.get("updatedFields"), dict) else {}
        updated_state: Dict[str, Any] = {}
        field_meta: Dict[str, FieldMeta] = {}

        # Guard against a tracked-field attribution leak: the intake LLM has
        # occasionally echoed the same raw reply into two or more unrelated
        # slots in one turn (observed: a logo answer duplicated verbatim into
        # servicesProducts AND preferredColors, neither of which are even in
        # its official slot list). A single reply cannot legitimately be the
        # verbatim value of two different structured fields at once, so if the
        # same normalized text shows up under multiple keys this turn, drop it
        # everywhere except business_description, which is the one slot meant
        # to hold the raw paragraph.
        value_signatures: Dict[str, List[str]] = {}
        for key, raw in tracked_fields.items():
            if not isinstance(raw, dict):
                continue
            signature = self._raw_tracked_value_signature(raw.get("value"))
            if not signature:
                continue
            value_signatures.setdefault(signature, []).append(key)
        duplicated_keys = {
            key
            for keys in value_signatures.values()
            if len(keys) > 1
            for key in keys
            if key != "business_description"
        }

        for key, raw in tracked_fields.items():
            if key not in INTAKE_STATE_FIELDS or not isinstance(raw, dict):
                continue
            if key in duplicated_keys:
                logger.warning(
                    "LyraIntakeEngine dropped tracked field '%s': value matches another field verbatim (attribution leak guard)",
                    key,
                )
                continue
            tracked = TrackedField.model_validate(raw)
            if tracked.value is None or tracked.value == "":
                continue
            self._merge_tracked_field(key, tracked, updated_state, field_meta)

        detected_intent = DetectedIntent.model_validate(payload.get("detectedIntent") or {})
        ai_confidence = max(detected_intent.confidence or 0.0, 0.75)
        state_payload = self._state_payload(state)
        interim_meta = {**(state.fieldMeta or {}), **{key: value.model_dump() for key, value in field_meta.items()}}
        if (
            detected_intent.salesFlow
            and detected_intent.salesFlow in VALID_SALES_FLOWS
            and self._can_replace_ai_derived(state, "salesFlow")
            and not self._sales_flow_resolved({**state_payload, **updated_state}, interim_meta)
        ):
            updated_state["salesFlow"] = detected_intent.salesFlow
            field_meta["salesFlow"] = FieldMeta(source="ai_recommended", confidence=ai_confidence)
            field_meta["sales_flow"] = FieldMeta(source="ai_recommended", confidence=ai_confidence)

        if detected_intent.niche and detected_intent.niche != "general" and "industry" not in updated_state:
            updated_state["industry"] = detected_intent.niche
            field_meta.setdefault(
                "niche",
                FieldMeta(source="inferred", confidence=max(0.0, min(detected_intent.confidence, 0.86))),
            )

        recommendation = None
        if isinstance(payload.get("templateRecommendation"), dict):
            recommendation = TemplateRecommendation.model_validate(payload["templateRecommendation"])

        merged_meta = {**(state.fieldMeta or {}), **{key: value.model_dump() for key, value in field_meta.items()}}
        missing = self._missing_fields_from_state(state, updated_state, merged_meta)
        can_generate = len(missing) == 0
        next_question = None if can_generate else (payload.get("nextQuestion") or None)
        if not can_generate and not next_question:
            next_question = self._fallback_question(missing, state.selectedLanguage)

        return LyraIntakeDecision(
            updatedState=updated_state,
            fieldMeta=field_meta,
            detectedIntent=detected_intent,
            missingCriticalFields=missing,
            reasoning=str(payload.get("reasoning") or ""),
            nextQuestion=next_question,
            canGenerate=can_generate,
            templateRecommendation=recommendation,
        )

    @staticmethod
    def _raw_tracked_value_signature(value: Any) -> str:
        """Normalize a TrackedField.value for verbatim-duplicate comparison."""
        if value is None:
            return ""
        if isinstance(value, (list, tuple)):
            text = " ".join(str(item) for item in value)
        elif isinstance(value, dict):
            text = " ".join(str(item) for item in value.values())
        else:
            text = str(value)
        return text.strip().lower()

    def _merge_tracked_field(
        self,
        key: str,
        tracked: TrackedField,
        updated_state: Dict[str, Any],
        field_meta: Dict[str, FieldMeta],
    ) -> None:
        canonical_key = SLOT_FIELD_ALIASES.get(key, key)

        if key == "niche":
            niche = normalize_niche(tracked.value)
            confidence = tracked.confidence if niche != "general" else min(tracked.confidence, 0.45)
            updated_state["industry"] = niche
            field_meta["niche"] = FieldMeta(source=tracked.source, confidence=confidence)
            field_meta["industry"] = FieldMeta(source=tracked.source, confidence=confidence)
            return

        if key == "brand_style":
            brand_path = self._extract_choice_path(tracked.value)
            if tracked.source not in {"explicit", "explicit_delegation"}:
                return
            if brand_path not in VALID_BRAND_STYLE_PATHS:
                brand_path = "explicit_delegation" if tracked.source == "explicit_delegation" else "explicit_preference"
            text_value = self._human_readable_slot_value(tracked.value)
            if text_value and text_value.lower() not in {"lyra decides", "tu decides", "tú decides", "you decide"}:
                updated_state.setdefault("preferredTone", text_value)
            meta_source: FieldSource = "explicit_delegation" if brand_path == "explicit_delegation" else "explicit"
            field_meta["brand_style"] = FieldMeta(source=meta_source, confidence=max(tracked.confidence, 0.82))
            field_meta.setdefault("preferredTone", FieldMeta(source=meta_source, confidence=max(tracked.confidence, 0.82)))
            return

        if key == "logo":
            logo_path = self._extract_choice_path(tracked.value)
            if logo_path not in VALID_LOGO_PATHS or tracked.source not in {"explicit", "explicit_delegation"}:
                return
            field_meta["logo"] = FieldMeta(source="explicit", confidence=max(tracked.confidence, 0.82))
            if logo_path == "has_logo" and isinstance(tracked.value, dict) and tracked.value.get("url"):
                updated_state["logoUrl"] = tracked.value.get("url")
                field_meta["logoUrl"] = FieldMeta(source="explicit", confidence=max(tracked.confidence, 0.9))
            return

        if canonical_key not in INTAKE_STATE_FIELDS:
            return

        updated_state[canonical_key] = tracked.value
        field_meta[canonical_key] = FieldMeta(source=tracked.source, confidence=tracked.confidence)

        if canonical_key == "salesFlow":
            field_meta["sales_flow"] = FieldMeta(source=tracked.source, confidence=tracked.confidence)
        elif canonical_key == "businessName":
            field_meta["business_name"] = FieldMeta(source=tracked.source, confidence=tracked.confidence)
        elif canonical_key == "businessDescription":
            field_meta["business_description"] = FieldMeta(source=tracked.source, confidence=tracked.confidence)

    @staticmethod
    def _extract_choice_path(value: Any) -> str:
        if isinstance(value, dict):
            for key in ("path", "mode", "type", "value", "choice"):
                candidate = str(value.get(key) or "").strip().lower()
                if candidate:
                    return LyraIntakeEngine._normalize_choice_path(candidate)
        return LyraIntakeEngine._normalize_choice_path(str(value or "").strip().lower())

    @staticmethod
    def _normalize_choice_path(text: str) -> str:
        compact = text.strip().lower().replace(" ", "_").replace("-", "_")
        if compact in VALID_BRAND_STYLE_PATHS or compact in VALID_LOGO_PATHS:
            return compact
        if any(phrase in compact for phrase in ("tu_decide", "tú_decide", "sorprendeme", "sorpréndeme", "lyra_decides", "you_decide")):
            return "explicit_delegation"
        if any(phrase in compact for phrase in ("generate", "generar", "crear", "design_one", "diseñar", "disenar")):
            return "wants_generated"
        if any(phrase in compact for phrase in ("upload", "subir", "tengo_logo", "has_logo")):
            return "has_logo"
        if any(phrase in compact for phrase in ("skip", "despues", "después", "later", "no_logo", "sin_logo")):
            return "explicit_skip"
        return compact

    @staticmethod
    def _human_readable_slot_value(value: Any) -> str:
        if isinstance(value, dict):
            parts = [
                str(value.get(key) or "").strip()
                for key in ("style", "tone", "colors", "reference", "description", "value")
                if str(value.get(key) or "").strip()
            ]
            text = ", ".join(dict.fromkeys(parts))
            if text in VALID_BRAND_STYLE_PATHS or text in VALID_LOGO_PATHS:
                return ""
            return text
        return str(value or "").strip()

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
            "logoPreference": state.logoPreference,
            "photoUrls": state.photoUrls,
            "websiteType": state.websiteType,
            "selectedTemplateId": state.selectedTemplateId,
            "selectedTemplateName": state.selectedTemplateName,
            "catalogType": state.catalogType,
            "salesFlow": state.salesFlow,
            "fieldMeta": state.fieldMeta,
        }

    def _business_intake_payload(self, state: ProjectState) -> Dict[str, Any]:
        meta = state.fieldMeta or {}
        return {
            "business_name": self._slot_snapshot(state.businessName, meta.get("business_name") or meta.get("businessName")),
            "business_description": self._slot_snapshot(
                state.businessDescription,
                meta.get("business_description") or meta.get("businessDescription"),
            ),
            "niche": self._slot_snapshot(normalize_niche(state.industry), meta.get("niche") or meta.get("industry")),
            "sales_flow": self._slot_snapshot(state.salesFlow, meta.get("sales_flow") or meta.get("salesFlow")),
            "target_audience": self._slot_snapshot(
                state.targetAudience,
                meta.get("target_audience") or meta.get("targetAudience"),
            ),
            "brand_style": self._slot_snapshot(
                state.preferredTone or state.preferredColors,
                meta.get("brand_style") or meta.get("preferredTone") or meta.get("preferredColors"),
            ),
            "logo": self._slot_snapshot(state.logoUrl or state.logoPreference or "", meta.get("logo") or meta.get("logoUrl") or meta.get("logoPreference")),
            "location": self._slot_snapshot(state.location, meta.get("location")),
            "contact_info": self._slot_snapshot(state.contactInfo, meta.get("contactInfo")),
        }

    @staticmethod
    def _slot_snapshot(value: Any, meta: Any) -> Dict[str, Any]:
        meta_dict = meta if isinstance(meta, dict) else {}
        return {
            "value": value,
            "source": meta_dict.get("source") or "",
            "confidence": meta_dict.get("confidence") or 0,
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

    def _missing_fields_from_state(
        self,
        state: ProjectState,
        updates: Dict[str, Any],
        merged_meta: Optional[Dict[str, Any]] = None,
    ) -> List[str]:
        merged = {**self._state_payload(state), **updates}
        meta = merged_meta if merged_meta is not None else (state.fieldMeta or {})
        missing: List[str] = []

        if not str(merged.get("businessName") or "").strip():
            missing.append("business_name")

        if not str(merged.get("businessDescription") or "").strip():
            missing.append("business_description")

        niche = normalize_niche(merged.get("industry"))
        if niche == "general" and not self._has_confident_meta(meta, "niche", min_confidence=0.7):
            missing.append("niche")

        if not self._sales_flow_resolved(merged, meta):
            missing.append("sales_flow")

        if not self._brand_style_resolved(merged, meta):
            missing.append("brand_style")

        if not self._logo_resolved(merged, meta):
            missing.append("logo")
        return missing

    def missing_fields_from_state(
        self,
        state: ProjectState,
        updates: Optional[Dict[str, Any]] = None,
        merged_meta: Optional[Dict[str, Any]] = None,
    ) -> List[str]:
        return self._missing_fields_from_state(state, updates or {}, merged_meta)

    def fallback_question_for_missing(self, missing: List[str], language: SupportedLanguage) -> str:
        return self._fallback_question(missing, language)

    def _brand_style_resolved(self, merged: Dict[str, Any], meta: Dict[str, Any]) -> bool:
        has_value = bool(str(merged.get("preferredTone") or merged.get("preferredColors") or "").strip())
        explicit_sources = {"explicit", "explicit_delegation", "explicit_user_choice"}
        if self._has_confident_meta(meta, "brand_style", sources=explicit_sources, min_confidence=0.7):
            return True
        if has_value and (
            self._has_confident_meta(meta, "preferredTone", sources=explicit_sources, min_confidence=0.7)
            or self._has_confident_meta(meta, "preferredColors", sources=explicit_sources, min_confidence=0.7)
        ):
            return True
        return False

    def _sales_flow_resolved(self, merged: Dict[str, Any], meta: Dict[str, Any]) -> bool:
        sales_flow = str(merged.get("salesFlow") or "").strip()
        if sales_flow not in VALID_SALES_FLOWS:
            return False
        sources = {"explicit", "explicit_delegation", "explicit_user_choice", "ai_recommended"}
        return (
            self._has_confident_meta(meta, "sales_flow", sources=sources, min_confidence=0.7)
            or self._has_confident_meta(meta, "salesFlow", sources=sources, min_confidence=0.7)
        )

    def _logo_resolved(self, merged: Dict[str, Any], meta: Dict[str, Any]) -> bool:
        if str(merged.get("logoUrl") or "").strip():
            return True
        return self._has_confident_meta(meta, "logo", sources={"explicit", "explicit_delegation", "explicit_user_choice"}, min_confidence=0.7)

    @staticmethod
    def _has_confident_meta(
        meta: Dict[str, Any],
        key: str,
        *,
        sources: Optional[set[str]] = None,
        min_confidence: float = 0.7,
    ) -> bool:
        raw = meta.get(key)
        if not isinstance(raw, dict):
            return False
        source = str(raw.get("source") or "")
        confidence = raw.get("confidence", 0)
        try:
            numeric_confidence = float(confidence)
        except (TypeError, ValueError):
            numeric_confidence = 0.0
        if sources is not None and source not in sources:
            return False
        return numeric_confidence >= min_confidence

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
            if "niche" in missing or "sales_flow" in missing:
                return "Necesito ubicar bien el tipo de proyecto. ¿Quieres vender online, recibir cotizaciones, aceptar reservas, captar clientes o solo presentar información?"
            if "business_name" in missing:
                return "No pude identificar el nombre del negocio. Como se llama?"
            if "business_description" in missing:
                return "No pude identificar claramente que vende o hace. Escribelo en un parrafo con productos o servicios principales."
            if "brand_style" in missing:
                return "¿Tienes colores, tono o estilo preferido? Si prefieres, dime “tú decides” y yo elijo una dirección visual que combine con el negocio."
            if "logo" in missing:
                return "¿Tienes un logo para subir, o seguimos por ahora con el nombre de tu negocio en texto?"
            return "No pude procesar eso bien. Puedes reformularlo en una frase mas clara?"
        if "niche" in missing or "sales_flow" in missing:
            return "I need to classify the project correctly. Do you want to sell online, receive quotes, take bookings, capture leads, or present information?"
        if "business_name" in missing:
            return "I could not identify the business name. What is it called?"
        if "business_description" in missing:
            return "I could not clearly identify what it sells or does. Write one paragraph with the main products or services."
        if "brand_style" in missing:
            return "Do you have preferred colors, tone, or style? If you prefer, say “you decide” and I will choose a visual direction that fits the business."
        if "logo" in missing:
            return "Do you have a logo to upload, or should we continue for now with your business name in text?"
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
                "source": {"type": "string", "enum": ["explicit", "inferred", "default", "explicit_delegation"]},
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
                            "description": (
                                "Only include a key when this turn's message actually supports it. "
                                "Valid keys are EXACTLY these 9 slots: business_name, business_description, "
                                "niche, sales_flow, target_audience, brand_style, logo, location, contact_info. "
                                "Never invent other keys (e.g. servicesProducts, preferredColors, colors, "
                                "products) - those are not part of this form and are derived elsewhere. "
                                "Never copy the same raw reply into more than one key."
                            ),
                            "properties": {
                                "business_name": tracked_field_schema,
                                "business_description": tracked_field_schema,
                                "niche": tracked_field_schema,
                                "sales_flow": tracked_field_schema,
                                "target_audience": tracked_field_schema,
                                "brand_style": tracked_field_schema,
                                "logo": tracked_field_schema,
                                "location": tracked_field_schema,
                                "contact_info": tracked_field_schema,
                            },
                            "additionalProperties": False,
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
                                "niche": {"type": "string", "enum": list(NICHE_TAXONOMY_LIST)},
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
        niche_list = ", ".join(NICHE_TAXONOMY_LIST)
        template_ids = ", ".join(TEMPLATE_CATALOG.keys())
        return f"""
Eres Lyra, directora de diseño e intake senior de KREATON. Tu único trabajo en este
paso es llenar un formulario estructurado de intención de negocio (BusinessIntakeForm)
a partir de la conversación con el cliente — no generas copy público ni HTML aquí.

FORMULARIO A COMPLETAR (slots):
- business_name (string)
- business_description (string: qué vende/hace, en sus propias palabras)
- niche (debe ser EXACTAMENTE uno de: {niche_list} — nunca inventes uno nuevo;
  si no calza claramente con ninguno, usa "general" y baja tu confidence)
- sales_flow (uno de: online_sales, quote_request, booking, lead_capture, informational)
- target_audience (string, opcional pero deseable)
- brand_style: uno de dos caminos válidos
    (a) explicit_preference: el cliente da colores/tono/referencias concretas, o
    (b) explicit_delegation: el cliente dice textualmente que Lyra elija (frases tipo
        "tú decide", "sorpréndeme", "el que creas mejor", "no tengo preferencia,
        hazlo tú")
  NUNCA marques este slot como resuelto solo porque el nicho "sugiere" un color.
  Inferencia de estilo sin que el cliente lo pida es un error grave.
- logo: uno de tres caminos válidos
    (a) has_logo (el cliente subirá/tiene uno), (b) wants_generated (pide que
    KREATON diseñe uno), (c) explicit_skip (no le importa por ahora)
  IMPORTANTE al preguntar por este slot: en este flujo gratuito, tu pregunta debe
  ofrecer SOLO dos caminos — "subir tu logo" o "seguir sin logo por ahora" —.
  NUNCA propongas ni menciones que KREATON puede generar un logo con IA; esa opción
  está reservada para el plan pago y no se ofrece de forma proactiva. El camino
  wants_generated solo se marca si el cliente lo pide espontáneamente por su cuenta,
  nunca porque tu pregunta se lo sugirió.
- location (opcional, requerido solo si el negocio tiene presencia física)
- contact_info (opcional en esta fase, se puede completar después)

REGLA DE ORO: canGenerate=true SOLO si business_name, business_description, niche,
sales_flow, brand_style Y logo están resueltos (con cualquiera de sus caminos válidos).
Ningún otro slot bloquea. No hay excepciones "porque el mensaje fue largo y detallado":
un párrafo largo puede llenar 4 slots a la vez, pero si brand_style o logo no aparecieron
en ese párrafo, siguen vacíos.

PROCESO EN CADA TURNO:
1. Lee el mensaje, el estado actual de slots, y el historial.
2. Actualiza SOLO los slots que el mensaje realmente sustenta. Marca cada campo con
   source=explicit (el cliente lo dijo con claridad), inferred (lo dedujiste con alta
   confianza de contexto no ambiguo) o explicit_delegation (el cliente delegó la
   decisión a Lyra explícitamente). brand_style y logo NUNCA usan source=inferred.
3. Si dos o más slots quedaron vacíos, prioriza preguntar por el de mayor peso en este
   orden: niche/sales_flow > business_name > business_description > brand_style > logo
   > location > contact_info.
4. Redacta nextQuestion como UNA sola pregunta conversacional y cálida, en el idioma del
   cliente, que:
   - reconozca brevemente lo que ya entendiste (sin repetirlo todo)
   - ofrezca al cliente la opción de delegar cuando aplique ("si prefieres, dime que tú
     decides y yo elijo un estilo que combine con tu negocio")
   - nunca sea una lista de 3 preguntas en una
5. Cuando canGenerate=true, recomienda UNA plantilla de {template_ids}, eligiendo
   por semántica de negocio, no por conteo de palabras clave.
6. Nunca escribas copy público aquí. Nunca generes HTML. Nunca inventes un nicho fuera
   de la taxonomía cerrada.
7. Devuelve tu respuesta únicamente llamando a la función update_intake — nunca en
   prosa libre.

Recuerda: tu métrica de éxito no es generar rápido, es generar bien a la primera.
Un sitio generado sin estilo definido y con catálogo genérico es peor que una pregunta
más al cliente.
""".strip()
