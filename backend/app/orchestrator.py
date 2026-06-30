from __future__ import annotations

import asyncio
from typing import Any, Dict

from pydantic import ValidationError

from .agents import (
    ArtDirectorAgent,
    BaseAgent,
    CatalogAgent,
    CopywriterAgent,
    IntakeExtractionAgent,
    StrategyAgent,
    ValidationAgent,
    split_items,
)
from .models import AgentResult, ProjectState
from .state_manager import StateManager


def normalize_state_payload(payload: Dict[str, Any] | None) -> ProjectState:
    payload = payload or {}
    return ProjectState(
        businessName=payload.get("businessName") or payload.get("business_name"),
        businessDescription=payload.get("businessDescription") or payload.get("business_description"),
        industry=payload.get("industry"),
        location=payload.get("location"),
        servicesProducts=split_items(payload.get("servicesProducts") or payload.get("services_products")),
        targetAudience=payload.get("targetAudience") or payload.get("target_audience"),
        preferredTone=payload.get("preferredTone") or payload.get("preferred_tone"),
        preferredColors=payload.get("preferredColors") or payload.get("preferred_colors"),
        contactInfo=payload.get("contactInfo") if isinstance(payload.get("contactInfo"), dict) else {},
        logoUrl=payload.get("logoUrl"),
        photoUrls=payload.get("photoUrls") or [],
        selectedLanguage=payload.get("selectedLanguage") or "en",
        websiteType=payload.get("websiteType"),
        selectedTemplateId=payload.get("selectedTemplateId") or payload.get("selected_template_id"),
        selectedTemplateName=payload.get("selectedTemplateName"),
        catalogType=payload.get("catalogType"),
        salesFlow=payload.get("salesFlow"),
        colors=payload.get("colors") or {},
        typography=payload.get("typography") or {},
        generatedCopy=payload.get("generatedCopy") or {},
        catalogItems=payload.get("catalogItems") or [],
    )


class LyraOrchestrator:
    """Router + worker orchestration for KREATON/LYRA."""

    def __init__(self) -> None:
        self.extractor = IntakeExtractionAgent()
        self.strategist = StrategyAgent()
        self.art_director = ArtDirectorAgent()
        self.copywriter = CopywriterAgent()
        self.catalog = CatalogAgent()
        self.validator = ValidationAgent()

    async def run(self, user_input: str, initial_state: ProjectState | None = None) -> ProjectState:
        manager = StateManager(initial_state)

        # 1. Extract natural-language fields first.
        await self._run_and_merge(manager, self.extractor, user_input)

        # 2. Strategy must run before workers because it chooses template/type.
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

        # 4. Validate final state strictly before returning to the frontend.
        await self._run_and_merge(manager, self.validator, user_input)
        return await manager.snapshot()

    async def _run_and_merge(self, manager: StateManager, agent: BaseAgent, user_input: str) -> AgentResult:
        snapshot = await manager.snapshot()
        result = await self._safe_run(agent, snapshot, user_input)
        await manager.update(result.updates)
        await manager.add_note(result.reasoningSummary or "")
        return result

    async def _safe_run(self, agent: BaseAgent, state: ProjectState, user_input: str) -> AgentResult:
        try:
            result = await agent.run(state, user_input)
            return AgentResult.model_validate(result.model_dump())
        except ValidationError as error:
            return AgentResult(
                agentName=agent.name,
                warnings=[f"Invalid agent output: {error}"],
                confidence=0.0,
            )
        except Exception as error:
            return AgentResult(
                agentName=agent.name,
                warnings=[f"Agent failed: {error}"],
                confidence=0.0,
            )


def site_plan_from_state(state: ProjectState) -> Dict[str, Any]:
    return {
        "recommendedTemplateId": state.selectedTemplateId,
        "recommendedTemplateName": state.selectedTemplateName,
        "websiteType": state.websiteType,
        "catalogType": state.catalogType,
        "salesFlow": state.salesFlow,
        "colors": state.colors,
        "typography": state.typography,
        "copyPolicy": "Use intake as private strategy. Generate polished public copy.",
        "notes": state.notes[-6:],
    }


def next_question_for_state(state: ProjectState) -> str:
    language = state.selectedLanguage
    missing = set(state.missingImportantFields)
    if "businessName" in missing:
        return {
            "es": "¿Cómo se llama el negocio?",
            "fr": "Comment s'appelle l'entreprise ?",
            "pt": "Qual é o nome do negócio?",
        }.get(language, "What is the business name?")
    if "businessDescription" in missing:
        return {
            "es": "Descríbeme en una frase qué vende o qué hace.",
            "fr": "Décrivez en une phrase ce que l'entreprise vend ou fait.",
            "pt": "Descreva em uma frase o que o negócio vende ou faz.",
        }.get(language, "Tell me in one sentence what it sells or does.")
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
