from sqlalchemy import select
from sqlalchemy.orm import Session

from .site_graph_contract import DesignPattern
from .site_graph_models import DesignReferencePattern


# User-authored descriptions only; tags are literal terms from those descriptions.
SEEDS = [
    DesignPattern(pattern_id="editorial_minimal", name="editorial_minimal", industry_tags=["product"], style_descriptor={
        "palette_roles": "2 neutros + 1 acento tierra sin gradientes", "type_pairing": "sans geometrica",
        "layout_rhythm": "mucho espacio blanco", "imagery_style": "producto aislado y centrado", "density": "sensacion calma/premium"}),
    DesignPattern(pattern_id="bold_commerce", name="bold_commerce", industry_tags=["commerce"], style_descriptor={
        "palette_roles": "color saturado protagonista", "type_pairing": "display expresiva en titulares",
        "layout_rhythm": "CTAs grandes y repetidos", "imagery_style": "hero de accion real", "density": "sensacion de energia"}),
    DesignPattern(pattern_id="luxury_quiet", name="luxury_quiet", industry_tags=["luxury"], style_descriptor={
        "palette_roles": "tonos tierra/neutros profundos", "type_pairing": "serif editorial con tracking amplio",
        "layout_rhythm": "ritmo lento", "imagery_style": "imagenes full-bleed", "density": "muy poco texto, sensacion de exclusividad"}),
]


def bootstrap_patterns(session: Session):
    from sqlalchemy.dialects.postgresql import insert as pg_insert
    from sqlalchemy.dialects.sqlite import insert as sqlite_insert
    insert = pg_insert if session.bind.dialect.name == "postgresql" else sqlite_insert
    for pattern in SEEDS:
        session.execute(insert(DesignReferencePattern).values(**pattern.model_dump()).on_conflict_do_nothing(index_elements=["pattern_id"]))
    session.commit()


def get_seed_patterns(industry_tag: str, session: Session) -> list[DesignPattern]:
    # Future sprint: replace exact tag matching with abstract-descriptor embeddings.
    tag = industry_tag.strip().lower()
    return [DesignPattern(pattern_id=p.pattern_id, name=p.name, industry_tags=p.industry_tags,
                          style_descriptor=p.style_descriptor)
            for p in session.scalars(select(DesignReferencePattern).order_by(DesignReferencePattern.pattern_id))
            if tag in p.industry_tags]
