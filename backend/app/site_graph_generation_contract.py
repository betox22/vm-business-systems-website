import json
from copy import deepcopy
from typing import Literal

from pydantic import Field

from .site_graph_contract import AddBlock, OperationsRequest, SiteGraph, StrictModel, apply_operations


class GenerationRequest(StrictModel):
    scenario_id: Literal["studio_goods", "outdoor_tools", "quiet_objects"]
    industry_tag: Literal["product", "commerce", "luxury"]
    language: Literal["en", "es"] = "en"
    expected_version: Literal[0] = 0


class ProposedGraph(StrictModel):
    operations: list[AddBlock] = Field(min_length=3, max_length=5)


SCENARIOS = {
    "studio_goods": {"name": "Graph Studio Goods", "brief": "Synthetic stationery shop for the graph experiment. No real business or website.",
                     "products": [{"name": "A5 Notebook", "description": "Plain pages for notes."},
                                  {"name": "Desk Ruler", "description": "A ruler for desk work."}]},
    "outdoor_tools": {"name": "Graph Garden Tools", "brief": "Synthetic gardening tool shop for the graph experiment. No real business or website.",
                      "products": [{"name": "Hand Trowel", "description": "A hand tool for planting."},
                                   {"name": "Garden Fork", "description": "A hand tool for loosening soil."}]},
    "quiet_objects": {"name": "Graph Quiet Objects", "brief": "Synthetic ceramic tableware shop for the graph experiment. No real business or website.",
                      "products": [{"name": "Ceramic Cup", "description": "A ceramic drinking cup."},
                                   {"name": "Ceramic Bowl", "description": "A ceramic serving bowl."}]},
}

RULES = [
    "Return one JSON object matching the schema, with no markdown or commentary.",
    "Use exactly one hero, one product_grid and one footer, in that order. Optionally append at most one of each fixed embed.",
    "Every block has layout_variant=default and a unique block_id; order_index starts at zero and is contiguous.",
    "Hero content has only headline and subheadline, both nonempty plain strings of at most 400 characters.",
    "Product grid content has only heading and items. Each item has only name and description, nonempty plain strings of at most 400 characters.",
    "Use every product name from scenario.products exactly once, unchanged. No other products. Write descriptions and other copy in scenario.language.",
    "Footer content has only text, a nonempty plain string of at most 400 characters.",
    "No HTML, URLs, invented prices, ratings, stock, promotions, claims or contacts. Use only the synthetic facts provided.",
    "Fixed embeds are references only: cart_embed content={module:shared-commerce-cart}; checkout_embed content={module:storefront-checkout}.",
]


def synthetic_scenario(request: GenerationRequest) -> dict:
    return {**deepcopy(SCENARIOS[request.scenario_id]), "language": request.language}


def generation_contract() -> dict:
    return {"schema": ProposedGraph.model_json_schema(), "rules": list(RULES)}


def _plain(value):
    if not isinstance(value, str) or not value.strip() or len(value) > 400:
        raise ValueError("Invalid visible text")
    if any(token in value.lower() for token in ("<", ">", "://", "www.", "data:", "javascript:")):
        raise ValueError("Markup and resource references are not permitted")


def _unique_keys(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("Duplicate JSON key")
        result[key] = value
    return result


def validate_generated_batch(raw: str, request: GenerationRequest, site_id: str) -> OperationsRequest:
    if not isinstance(raw, str) or len(raw.encode()) > 65536:
        raise ValueError("Invalid generation size")
    data = json.loads(raw, object_pairs_hook=_unique_keys)
    proposal = ProposedGraph.model_validate(data)
    batch = OperationsRequest(expected_version=0, operations=proposal.operations)
    graph = apply_operations(SiteGraph(site_id=site_id, version=0, blocks=[]), batch)
    kinds = [b.type for b in graph.blocks]
    if kinds[:3] != ["hero", "product_grid", "footer"] or len(set(kinds)) != len(kinds):
        raise ValueError("Invalid page composition")
    if any(k not in ("cart_embed", "checkout_embed") for k in kinds[3:]):
        raise ValueError("Only fixed embeds may follow the footer")
    for block in graph.blocks:
        content = block.content
        if block.layout_variant != "default":
            raise ValueError("Unsupported preview variant")
        if block.type == "hero":
            if set(content) != {"headline", "subheadline"}:
                raise ValueError("Invalid hero content")
            for value in content.values():
                _plain(value)
        elif block.type == "footer":
            if set(content) != {"text"}:
                raise ValueError("Invalid footer content")
            _plain(content["text"])
        elif block.type == "product_grid":
            if set(content) != {"heading", "items"} or not isinstance(content["items"], list):
                raise ValueError("Invalid product grid")
            _plain(content["heading"])
            names = []
            for item in content["items"]:
                if not isinstance(item, dict) or set(item) != {"name", "description"}:
                    raise ValueError("Invalid product content")
                for value in item.values():
                    _plain(value)
                names.append(item["name"])
            expected = [p["name"] for p in SCENARIOS[request.scenario_id]["products"]]
            if sorted(names) != sorted(expected):
                raise ValueError("Product identity differs from synthetic scenario")
    return batch
