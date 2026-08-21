from __future__ import annotations

import asyncio
import logging
from types import UnionType
from typing import Any, Dict, Literal, Union, get_args, get_origin

from pydantic import ValidationError

from .ai_site_planner import OpenAISitePlanAgent
from .agents import (
    ArtDirectorAgent,
    BaseAgent,
    CatalogAgent,
    CopywriterAgent,
    IntakeExtractionAgent,
    ReviewerAgent,
    StrategyAgent,
    TEMPLATE_CATALOG,
    ValidationAgent,
    split_items,
)
from .models import AgentResult, ProjectState
from .state_manager import StateManager


logger = logging.getLogger("kreaton")


def _annotation_contains_literal(annotation: Any) -> bool:
    origin = get_origin(annotation)
    if origin is Literal:
        return True
    if origin in (Union, UnionType):
        return any(_annotation_contains_literal(arg) for arg in get_args(annotation))
    return False


PROJECT_STATE_LITERAL_FIELDS = {
    name
    for name, field in ProjectState.model_fields.items()
    if _annotation_contains_literal(field.annotation)
}


def _sanitize_project_state_payload(values: Dict[str, Any]) -> Dict[str, Any]:
    cleaned = dict(values)
    for field_name in PROJECT_STATE_LITERAL_FIELDS:
        value = cleaned.get(field_name)
        if isinstance(value, str) and not value.strip():
            cleaned[field_name] = None

    cleaned["selectedLanguage"] = cleaned.get("selectedLanguage") or "en"
    return cleaned


def normalize_state_payload(payload: Dict[str, Any] | None) -> ProjectState:
    payload = payload or {}
    preferred_colors = payload.get("preferredColors") or payload.get("preferred_colors")
    if isinstance(preferred_colors, list):
        preferred_colors = ", ".join(str(item).strip() for item in preferred_colors if str(item).strip())
    color_provenance = payload.get("colorProvenance") or payload.get("color_provenance") or {}
    if hasattr(color_provenance, "model_dump"):
        color_provenance = color_provenance.model_dump()
    return ProjectState(**_sanitize_project_state_payload({
        "businessName": payload.get("businessName") or payload.get("business_name"),
        "businessDescription": payload.get("businessDescription") or payload.get("business_description"),
        "industry": payload.get("industry"),
        "location": payload.get("location"),
        "servicesProducts": split_items(payload.get("servicesProducts") or payload.get("services_products")),
        "targetAudience": payload.get("targetAudience") or payload.get("target_audience"),
        "preferredTone": payload.get("preferredTone") or payload.get("preferred_tone"),
        "preferredColors": preferred_colors,
        "contactInfo": payload.get("contactInfo") if isinstance(payload.get("contactInfo"), dict) else {},
        "logoUrl": payload.get("logoUrl"),
        "logoPreference": payload.get("logoPreference") or payload.get("logo_preference"),
        "logoGenerationStatus": payload.get("logoGenerationStatus"),
        "logoPalette": payload.get("logoPalette") or payload.get("logo_palette") or [],
        "colorProvenance": color_provenance if isinstance(color_provenance, dict) else {},
        "photoUrls": payload.get("photoUrls") or [],
        "selectedLanguage": payload.get("selectedLanguage"),
        "websiteIntent": payload.get("websiteIntent") or payload.get("website_intent"),
        "websiteType": payload.get("websiteType"),
        "selectedTemplateId": payload.get("selectedTemplateId") or payload.get("selected_template_id"),
        "selectedTemplateName": payload.get("selectedTemplateName"),
        "catalogType": payload.get("catalogType"),
        "salesFlow": payload.get("salesFlow"),
        "colors": payload.get("colors") or {},
        "typography": payload.get("typography") or {},
        "generatedCopy": payload.get("generatedCopy") or {},
        "catalogItems": payload.get("catalogItems") or [],
        "catalogSource": payload.get("catalogSource") or payload.get("catalog_source"),
        "fieldMeta": payload.get("fieldMeta") if isinstance(payload.get("fieldMeta"), dict) else {},
    }))


class LyraOrchestrator:
    """Router + worker orchestration for KREATON/LYRA."""

    def __init__(self) -> None:
        self.extractor = IntakeExtractionAgent()
        self.strategist = StrategyAgent()
        self.art_director = ArtDirectorAgent()
        self.copywriter = CopywriterAgent()
        self.catalog = CatalogAgent()
        self.ai_site_planner = OpenAISitePlanAgent()
        self.validator = ValidationAgent()
        self.reviewer = ReviewerAgent()

    async def run(
        self,
        user_input: str,
        initial_state: ProjectState | None = None,
        *,
        skip_intake_strategy: bool = False,
        run_review: bool = False,
    ) -> ProjectState:
        manager = StateManager(initial_state)

        if not skip_intake_strategy:
            # 1. Extract natural-language fields first.
            await self._run_and_merge(manager, self.extractor, user_input)

            # 2. Strategy must run before workers because it chooses template/type.
            await self._run_and_merge(manager, self.strategist, user_input)
        else:
            snapshot = await manager.snapshot()
            if not snapshot.selectedTemplateId or not snapshot.websiteType:
                await self._run_and_merge(manager, self.strategist, user_input)

        # 3. Independent workers run concurrently after strategy.
        snapshot = await manager.snapshot()
        results = await asyncio.gather(
            self._safe_run(self.art_director, snapshot, user_input),
            self._safe_run(self.copywriter, snapshot, user_input),
            self._safe_run(self.catalog, snapshot, user_input),
        )
        for result in results:
            await manager.update(result.updates)
            await manager.add_note(result.reasoningSummary or "")

        # 4. Let the server-side AI director choose the final editable plan when configured.
        # If OPENAI_API_KEY is missing or validation fails, this returns no updates and
        # the deterministic workers above remain the fallback.
        planner_result = await self._run_and_merge(manager, self.ai_site_planner, user_input)
        if planner_result.updates.get("primaryOfferingCategory"):
            # Reconcile the final winner through the same selector without another
            # LLM call. The initial regex selection remains the offline fallback.
            await self._run_and_merge(manager, self.strategist, user_input)

        # 5. Validate final state strictly before returning to the frontend.
        await self._run_and_merge(manager, self.validator, user_input)
        if run_review:
            await self._review_and_correct_once(manager, user_input)
        return await manager.snapshot()

    async def _run_and_merge(self, manager: StateManager, agent: BaseAgent, user_input: str) -> AgentResult:
        snapshot = await manager.snapshot()
        result = await self._safe_run(agent, snapshot, user_input)
        await manager.update(result.updates)
        await manager.add_note(result.reasoningSummary or "")
        return result

    async def retry_site_planner(self, user_input: str, state: ProjectState) -> ProjectState:
        """Retry only the AI planner once while preserving the completed pipeline state."""
        manager = StateManager(state)
        await self._run_and_merge(manager, self.ai_site_planner, user_input)
        await self._run_and_merge(manager, self.validator, user_input)
        return await manager.snapshot()

    async def _safe_run(self, agent: BaseAgent, state: ProjectState, user_input: str) -> AgentResult:
        try:
            result = await agent.run(state, user_input)
            validated = AgentResult.model_validate(result.model_dump())
        except ValidationError as error:
            validated = AgentResult(
                agentName=agent.name,
                warnings=[f"Invalid agent output: {error}"],
                confidence=0.0,
            )
        except Exception as error:
            validated = AgentResult(
                agentName=agent.name,
                warnings=[f"Agent failed: {error}"],
                confidence=0.0,
            )

        for warning in validated.warnings:
            logger.warning("LYRA agent warning agent=%s warning=%s", validated.agentName, warning)
        if validated.updates.get("catalogSource") == "seed_fallback":
            logger.warning("LYRA agent fallback agent=%s path=seed_fallback", validated.agentName)
        return validated

    async def _review_and_correct_once(self, manager: StateManager, user_input: str) -> None:
        snapshot = await manager.snapshot()
        review = await self._safe_run(self.reviewer, snapshot, user_input)
        await manager.update(review.updates)
        await manager.add_note(review.reasoningSummary or "")

        verdict = {}
        generated_copy = review.updates.get("generatedCopy")
        if isinstance(generated_copy, dict):
            verdict = generated_copy.get("reviewerVerdict") or {}
        if verdict.get("severity") != "critical":
            return

        issues = verdict.get("issues") if isinstance(verdict.get("issues"), list) else []
        issue_details_by_agent: Dict[str, list[str]] = {"copywriter": [], "catalog": [], "strategist": []}
        suggested_strategy_template_id = ""
        for issue in issues:
            if isinstance(issue, dict):
                agent_name = str(issue.get("agent") or "")
                detail = str(issue.get("detail") or "").strip()
                if agent_name in issue_details_by_agent and detail:
                    issue_details_by_agent[agent_name].append(detail)
                if agent_name == "strategist" and not suggested_strategy_template_id:
                    suggested = str(issue.get("suggested_template_id") or issue.get("suggestedTemplateId") or "").strip()
                    if suggested in TEMPLATE_CATALOG:
                        suggested_strategy_template_id = suggested

        if issue_details_by_agent["strategist"]:
            details = " | ".join(issue_details_by_agent["strategist"])
            if not suggested_strategy_template_id:
                await manager.add_note(
                    "Reviewer strategist issue had no valid suggested_template_id; no strategy correction applied: "
                    f"{details}"
                )
                return
            snapshot = await manager.snapshot()
            if (
                snapshot.primaryOfferingCategory in TEMPLATE_CATALOG
                and snapshot.selectedTemplateId == snapshot.primaryOfferingCategory
                and suggested_strategy_template_id != snapshot.primaryOfferingCategory
            ):
                logger.warning(
                    "LYRA reviewer strategy override blocked primary=%s suggested=%s detail=%s",
                    snapshot.primaryOfferingCategory,
                    suggested_strategy_template_id,
                    details,
                )
                await manager.add_note(
                    "Reviewer strategist correction ignored because the AI planner already supplied "
                    f"authoritative primaryOfferingCategory={snapshot.primaryOfferingCategory}: {details}"
                )
                return
            selected_template = TEMPLATE_CATALOG[suggested_strategy_template_id]
            correction_input = (
                f"Business name: {snapshot.businessName or ''}\n"
                f"Business description: {snapshot.businessDescription or ''}\n"
                f"Products/services: {', '.join(snapshot.servicesProducts)}\n"
                f"Sales flow: {snapshot.salesFlow or ''}\n\n"
                f"Reviewer selected template correction: {suggested_strategy_template_id} "
                f"({selected_template['name']}).\n"
                f"Reviewer detail: {details}\n"
                "Regenerate visual direction, copy and catalog for this corrected template. "
                "Do not change intake facts."
            )
            await manager.update({
                "selectedTemplateId": suggested_strategy_template_id,
                "selectedTemplateName": selected_template["name"],
                "websiteType": selected_template["websiteType"],
                "catalogType": selected_template["catalogType"],
            })
            await manager.add_note(
                "Reviewer-triggered strategist correction: "
                f"{details}; applied template={suggested_strategy_template_id}"
            )

            snapshot = await manager.snapshot()
            worker_results = await asyncio.gather(
                self._safe_run(self.art_director, snapshot, correction_input),
                self._safe_run(self.copywriter, snapshot, correction_input),
                self._safe_run(self.catalog, snapshot, correction_input),
            )
            for worker_result in worker_results:
                await manager.update(worker_result.updates)
                await manager.add_note(worker_result.reasoningSummary or "")

            snapshot = await manager.snapshot()
            await manager.update({
                "generatedCopy": {
                    **(snapshot.generatedCopy or {}),
                    "reviewerVerdict": verdict,
                }
            })
            return

        correction_agents: list[tuple[str, BaseAgent]] = []
        if issue_details_by_agent["copywriter"]:
            correction_agents.append(("copywriter", self.copywriter))
        if issue_details_by_agent["catalog"]:
            correction_agents.append(("catalog", self.catalog))

        for agent_name, agent in correction_agents:
            details = " | ".join(issue_details_by_agent[agent_name])
            correction_input = (
                f"{user_input}\n\n"
                f"Reviewer correction request for {agent_name}: {details}\n"
                "Correct only your own output. Do not change unrelated strategy or intake."
            )
            snapshot = await manager.snapshot()
            result = await self._safe_run(agent, snapshot, correction_input)
            await manager.update(result.updates)
            await manager.add_note(f"Reviewer-triggered {agent_name} correction: {details}")
            await manager.add_note(result.reasoningSummary or "")

        snapshot = await manager.snapshot()
        await manager.update({
            "generatedCopy": {
                **(snapshot.generatedCopy or {}),
                "reviewerVerdict": verdict,
            }
        })

def site_plan_from_state(state: ProjectState) -> Dict[str, Any]:
    generated_pages = []
    if isinstance(state.generatedCopy, dict):
        generated_pages = state.generatedCopy.get("pages") or []
    return {
        "recommendedTemplateId": state.selectedTemplateId,
        "recommendedTemplateName": state.selectedTemplateName,
        "templateId": state.selectedTemplateId,
        "templateName": state.selectedTemplateName,
        "websiteIntent": state.websiteIntent,
        "websiteType": state.websiteType,
        "catalogType": state.catalogType,
        "salesFlow": state.salesFlow,
        "colors": state.colors,
        "typography": state.typography,
        "pages": generated_pages,
        "catalogCategories": state.generatedCopy.get("catalogCategories", []) if isinstance(state.generatedCopy, dict) else [],
        "copyPolicy": "Use intake as private strategy. Generate polished public copy.",
        "fieldMeta": state.fieldMeta,
        "notes": state.notes[-6:],
    }


def next_question_for_state(state: ProjectState) -> str:
    language = state.selectedLanguage
    missing = set(state.missingImportantFields)
    if not state.websiteIntent and not state.salesFlow and not state.websiteType:
        return {
            "es": "Dime qué quieres lograr: vender online, mostrar catálogo, recibir cotizaciones, reservas, presentar una empresa o crear un marketplace. Puedes responder en un párrafo completo.",
            "fr": "Dites-moi l'objectif : vendre en ligne, montrer un catalogue, recevoir des devis, réserver, présenter une entreprise ou créer une marketplace. Vous pouvez répondre en un paragraphe.",
            "pt": "Diga o objetivo: vender online, mostrar catálogo, receber orçamentos, agendamentos, apresentar uma empresa ou criar um marketplace. Pode responder em um parágrafo.",
        }.get(language, "Tell me the goal: sell online, show a catalog, receive quotes, bookings, present a company, or create a marketplace. You can answer in one full paragraph.")
    if "businessName" in missing:
        return {
            "es": "¿Cómo se llama el negocio?",
            "fr": "Comment s'appelle l'entreprise ?",
            "pt": "Qual é o nome do negócio?",
        }.get(language, "What is the business name?")
    if "businessDescription" in missing:
        return {
            "es": "Ahora dime qué vende o qué hace. Si quieres, pon todo en un solo párrafo: productos, categoría, cliente ideal, estilo, ubicación, logo y colores.",
            "fr": "Dites-moi maintenant ce que l'entreprise vend ou fait. Vous pouvez tout mettre dans un paragraphe : produits, catégorie, client idéal, style, localisation, logo et couleurs.",
            "pt": "Agora diga o que o negócio vende ou faz. Se quiser, coloque tudo em um parágrafo: produtos, categoria, cliente ideal, estilo, localização, logo e cores.",
        }.get(language, "Now tell me what it sells or does. You can put everything in one paragraph: products, category, audience, style, location, logo and colors.")
    if not state.servicesProducts and state.businessDescription:
        return {
            "es": "¿Cuáles son las principales categorías de productos o servicios? Si ya lo dijiste, puedes responder “usa lo anterior”.",
            "fr": "Quelles sont les principales catégories de produits ou services ? Si vous l'avez déjà dit, répondez “utilise ce qui précède”.",
            "pt": "Quais são as principais categorias de produtos ou serviços? Se já disse, responda “use o anterior”.",
        }.get(language, "What are the main product or service categories? If you already said it, answer “use the previous details”.")
    return ""


def assistant_message_for_state(state: ProjectState) -> str:
    name = state.businessName or "the business"
    template = state.selectedTemplateName or "the best matching template"
    if state.selectedLanguage == "es":
        if state.missingImportantFields:
            return f"Ya organicé lo que entendí y estoy usando {template} como base. Falta un dato clave antes de generar."
        return f"Listo. Para {name}, la mejor base es {template}. Voy a usar tu información como estrategia y crear copy público profesional, no copiar tus notas."
    if state.selectedLanguage == "fr":
        if state.missingImportantFields:
            return f"J'ai organisé ce que j'ai compris et j'utilise {template} comme base. Il manque une information clé."
        return f"Parfait. Pour {name}, la meilleure base est {template}. Je vais créer un contenu public professionnel sans copier vos notes."
    if state.selectedLanguage == "pt":
        if state.missingImportantFields:
            return f"Organizei o que entendi e estou usando {template} como base. Falta uma informação importante."
        return f"Pronto. Para {name}, a melhor base é {template}. Vou criar textos profissionais sem copiar suas notas."
    if state.missingImportantFields:
        return f"I organized the intake and selected {template} as the base. One important detail is still missing."
    return f"Ready. For {name}, the best base is {template}. I will use your intake as strategy and write polished public copy."
