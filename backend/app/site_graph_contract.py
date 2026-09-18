"""Version 1 experimental graph contract. No LLM or commerce execution."""
from typing import Annotated, Literal, Union

from pydantic import BaseModel, ConfigDict, Field, JsonValue, model_validator

Identifier = Annotated[str, Field(pattern=r"^[a-zA-Z0-9][a-zA-Z0-9_-]{0,95}$")]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class Block(StrictModel):
    model_config = ConfigDict(extra="forbid", strict=True, json_schema_extra={"allOf": [
        {"if": {"properties": {"type": {"const": kind}}}, "then": {"properties": {
            "content": {"type": "object", "properties": {"module": {"const": module}},
                        "required": ["module"], "additionalProperties": False}}}}
        for kind, module in [("cart_embed", "shared-commerce-cart"), ("checkout_embed", "storefront-checkout")]
    ]})
    block_id: Identifier
    type: Literal["hero", "product_grid", "footer", "cart_embed", "checkout_embed"]
    content: dict[str, JsonValue]
    layout_variant: Identifier = "default"
    order_index: int = Field(ge=0, le=199)

    @model_validator(mode="after")
    def fixed_modules(self):
        if self.type in ("cart_embed", "checkout_embed"):
            expected = "shared-commerce-cart" if self.type == "cart_embed" else "storefront-checkout"
            if self.content != {"module": expected}:
                raise ValueError("Fixed embeds contain only their existing module reference")
        return self


class SiteGraph(StrictModel):
    schema_version: Literal[1] = 1
    site_id: Identifier
    version: int = Field(ge=0)
    blocks: list[Block] = Field(max_length=200)

    @model_validator(mode="after")
    def ordered_unique(self):
        if len({b.block_id for b in self.blocks}) != len(self.blocks):
            raise ValueError("block_id must be unique")
        if [b.order_index for b in self.blocks] != list(range(len(self.blocks))):
            raise ValueError("order_index must match contiguous list order")
        return self


class AddBlock(StrictModel):
    op: Literal["add_block"]
    block: Block


class RemoveBlock(StrictModel):
    op: Literal["remove_block"]
    block_id: Identifier


class MoveBlock(StrictModel):
    op: Literal["move_block"]
    block_id: Identifier
    order_index: int = Field(ge=0, le=199)


class UpdateContent(StrictModel):
    op: Literal["update_block_content"]
    block_id: Identifier
    content: dict[str, JsonValue]


class UpdateVariant(StrictModel):
    op: Literal["update_block_variant"]
    block_id: Identifier
    layout_variant: Identifier


Operation = Annotated[Union[AddBlock, RemoveBlock, MoveBlock, UpdateContent, UpdateVariant], Field(discriminator="op")]


class OperationsRequest(StrictModel):
    schema_version: Literal[1] = 1
    expected_version: int = Field(ge=0)
    operations: list[Operation] = Field(min_length=1, max_length=100)


# Closed vocabularies deliberately exclude arbitrary source material, URLs and site IDs.
class StyleDescriptor(StrictModel):
    palette_roles: Literal["2 neutros + 1 acento tierra sin gradientes", "color saturado protagonista", "tonos tierra/neutros profundos"]
    type_pairing: Literal["sans geometrica", "display expresiva en titulares", "serif editorial con tracking amplio"]
    layout_rhythm: Literal["mucho espacio blanco", "CTAs grandes y repetidos", "ritmo lento"]
    imagery_style: Literal["producto aislado y centrado", "hero de accion real", "imagenes full-bleed"]
    density: Literal["sensacion calma/premium", "sensacion de energia", "muy poco texto, sensacion de exclusividad"]


class DesignPattern(StrictModel):
    pattern_id: Literal["editorial_minimal", "bold_commerce", "luxury_quiet"]
    name: Literal["editorial_minimal", "bold_commerce", "luxury_quiet"]
    industry_tags: list[Literal["product", "commerce", "luxury"]] = Field(min_length=1, max_length=3)
    style_descriptor: StyleDescriptor


def apply_operations(graph: SiteGraph, batch: OperationsRequest) -> SiteGraph:
    blocks = [b.model_dump() for b in graph.blocks]
    for operation in batch.operations:
        if operation.op == "add_block":
            block = operation.block.model_dump()
            if block["order_index"] > len(blocks):
                raise ValueError("Insertion index outside graph")
            if any(b["block_id"] == block["block_id"] for b in blocks):
                raise ValueError("Duplicate block_id")
            blocks.insert(block["order_index"], block)
        else:
            index = next((i for i, b in enumerate(blocks) if b["block_id"] == operation.block_id), None)
            if index is None:
                raise ValueError("Unknown block_id")
            if operation.op == "remove_block":
                blocks.pop(index)
            elif operation.op == "move_block":
                if operation.order_index >= len(blocks):
                    raise ValueError("Move index outside graph")
                blocks.insert(operation.order_index, blocks.pop(index))
            elif operation.op == "update_block_content":
                blocks[index]["content"] = operation.content
            else:
                blocks[index]["layout_variant"] = operation.layout_variant
        for i, block in enumerate(blocks):
            block["order_index"] = i
        # Validate every intermediate operation, not just the final batch.
        SiteGraph(site_id=graph.site_id, version=graph.version, blocks=blocks)
    return SiteGraph(site_id=graph.site_id, version=graph.version + 1, blocks=blocks)
