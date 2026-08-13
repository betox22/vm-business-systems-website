import unittest

from app.agents import StrategyAgent
from app.models import AgentResult, ProjectState
from app.orchestrator import LyraOrchestrator


class StubAgent:
    def __init__(self, name: str, updates=None) -> None:
        self.name = name
        self.updates = updates or {}
        self.calls = 0

    async def run(self, state: ProjectState, user_input: str) -> AgentResult:
        self.calls += 1
        return AgentResult(agentName=self.name, updates=self.updates, confidence=1.0)


class CountingStrategyAgent(StrategyAgent):
    def __init__(self) -> None:
        self.calls = 0

    async def run(self, state: ProjectState, user_input: str) -> AgentResult:
        self.calls += 1
        return await super().run(state, user_input)


class StrategyAgentTests(unittest.IsolatedAsyncioTestCase):
    def test_spanish_plural_cursos_selects_education_template(self) -> None:
        template_id, reason = StrategyAgent()._select_template_id(
            "academia de cursos online de fotografia profesional",
            product_count=3,
            existing_template_id=None,
        )

        self.assertEqual(template_id, "education-course-academy-pro")
        self.assertIn("education", reason)

    async def test_ai_primary_intent_keeps_pure_academy_in_education(self) -> None:
        state = ProjectState(
            businessDescription="Academia de cursos digitales con materiales descargables.",
            servicesProducts=["Curso de fotografia", "Materiales descargables"],
            primaryOfferingCategory="education-course-academy-pro",
        )

        result = await StrategyAgent().run(state, state.businessDescription or "")

        self.assertEqual(result.updates["selectedTemplateId"], "education-course-academy-pro")
        self.assertIn("AI planner primary offering", result.reasoningSummary or "")

    async def test_ai_primary_intent_keeps_fashion_boutique_out_of_education(self) -> None:
        state = ProjectState(
            businessDescription="Boutique de ropa con clases de estilismo para sus clientes.",
            servicesProducts=["Vestidos", "Accesorios", "Clases de estilismo"],
            primaryOfferingCategory="fashion-drop-pro",
        )

        result = await StrategyAgent().run(state, state.businessDescription or "")

        self.assertEqual(result.updates["selectedTemplateId"], "fashion-drop-pro")
        self.assertNotEqual(result.updates["selectedTemplateId"], "education-course-academy-pro")

    async def test_ai_primary_intent_keeps_3d_equipment_store_product_first(self) -> None:
        state = ProjectState(
            businessName="Mi Mundo 3D",
            businessDescription=(
                "Venta de impresoras 3D, accesorios, materiales y equipos, con cursos "
                "sobre como fabricar los productos."
            ),
            servicesProducts=["Impresoras 3D", "Accesorios", "Cursos de fabricacion"],
            primaryOfferingCategory="premium-product-store",
            secondaryOfferingCategories=["education-course-academy-pro"],
        )

        result = await StrategyAgent().run(state, state.businessDescription or "")

        self.assertEqual(result.updates["selectedTemplateId"], "premium-product-store")
        self.assertNotEqual(result.updates["selectedTemplateId"], "education-course-academy-pro")

    async def test_orchestrator_reconciles_planner_intent_without_another_llm_call(self) -> None:
        orchestrator = LyraOrchestrator()
        planner = StubAgent("openai_site_planner", {
            "primaryOfferingCategory": "fashion-drop-pro",
            "secondaryOfferingCategories": ["education-course-academy-pro"],
        })
        strategist = CountingStrategyAgent()
        orchestrator.extractor = StubAgent("extractor")
        orchestrator.strategist = strategist
        orchestrator.art_director = StubAgent("art_director")
        orchestrator.copywriter = StubAgent("copywriter")
        orchestrator.catalog = StubAgent("catalog")
        orchestrator.ai_site_planner = planner
        orchestrator.validator = StubAgent("validator")

        final_state = await orchestrator.run(
            "Boutique de ropa con clases de estilismo",
            ProjectState(
                businessDescription="Boutique de ropa con clases de estilismo",
                servicesProducts=["Vestidos", "Accesorios", "Clases de estilismo"],
            ),
        )

        self.assertEqual(planner.calls, 1)
        self.assertEqual(strategist.calls, 2)
        self.assertEqual(final_state.selectedTemplateId, "fashion-drop-pro")


if __name__ == "__main__":
    unittest.main()
