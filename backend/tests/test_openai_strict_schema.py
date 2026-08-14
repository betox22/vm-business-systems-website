import unittest

from app.agents import BaseAgent, ReviewerAgent
from app.ai_site_planner import OpenAISitePlanAgent
from app.models import AgentResult, ProjectState
from app.orchestrator import LyraOrchestrator


def _walk_schema(node):
    if isinstance(node, dict):
        yield node
        for value in node.values():
            yield from _walk_schema(value)
    elif isinstance(node, list):
        for value in node:
            yield from _walk_schema(value)


def _allows_null(schema):
    schema_type = schema.get("type")
    if schema_type == "null" or isinstance(schema_type, list) and "null" in schema_type:
        return True
    return any(
        isinstance(option, dict) and _allows_null(option)
        for keyword in ("anyOf", "oneOf")
        for option in schema.get(keyword, [])
    )


class WarningAgent(BaseAgent):
    name = "warning_agent"

    async def run(self, state, user_input):
        return AgentResult(
            agentName=self.name,
            updates={"catalogSource": "seed_fallback"},
            warnings=["diagnostic warning"],
        )


class OpenAIStrictSchemaTests(unittest.IsolatedAsyncioTestCase):
    def test_planner_schema_is_recursive_strict_and_nullable(self):
        schema = OpenAISitePlanAgent._strict_response_format()["json_schema"]["schema"]

        for node in _walk_schema(schema):
            self.assertNotIn("default", node)
            properties = node.get("properties")
            if isinstance(properties, dict):
                self.assertEqual(set(node.get("required", [])), set(properties))
                self.assertIs(node.get("additionalProperties"), False)

        badge = schema["$defs"]["CopyProps"]["properties"]["badge"]
        self.assertTrue(_allows_null(badge))
        catalog_item = schema["$defs"]["PlannerCatalogItem"]
        self.assertEqual(set(catalog_item["required"]), set(catalog_item["properties"]))

    def test_reviewer_uses_the_same_recursive_strict_contract(self):
        schema = ReviewerAgent._strict_response_format()["json_schema"]["schema"]

        for node in _walk_schema(schema):
            properties = node.get("properties")
            if isinstance(properties, dict):
                self.assertEqual(set(node.get("required", [])), set(properties))
                self.assertIs(node.get("additionalProperties"), False)

    async def test_orchestrator_logs_warnings_and_seed_fallbacks(self):
        orchestrator = LyraOrchestrator()

        with self.assertLogs("kreaton", level="WARNING") as captured:
            result = await orchestrator._safe_run(WarningAgent(), ProjectState(), "test")

        self.assertEqual(result.warnings, ["diagnostic warning"])
        self.assertTrue(any("diagnostic warning" in line for line in captured.output))
        self.assertTrue(any("path=seed_fallback" in line for line in captured.output))


if __name__ == "__main__":
    unittest.main()
