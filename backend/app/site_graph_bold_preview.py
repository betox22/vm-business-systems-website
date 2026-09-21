"""Internal presentation lens. Assets are packaged QA material, never graph input."""
import base64
from functools import lru_cache
from html import escape
from pathlib import Path

from .site_graph_contract import SiteGraph

ASSETS = Path(__file__).with_name("site_graph_preview_assets") / "bold_commerce"
PRODUCT_PHOTOS = {"Martillo de una": "hammer", "Llave ajustable": "wrench", "Sargento": "clamp"}
ASSET_FILES = {"font": ("BarlowCondensed-Bold.ttf", "font/ttf"),
               **{name: (name + ".webp", "image/webp") for name in ("hero", "hammer", "wrench", "clamp")}}


@lru_cache(maxsize=5)
def _asset(name: str) -> str:
    filename, mime = ASSET_FILES[name]
    return f"data:{mime};base64," + base64.b64encode((ASSETS / filename).read_bytes()).decode("ascii")


def _text(value) -> str:
    return escape(value if isinstance(value, str) else "")


def _fixture_matches(graph: SiteGraph) -> bool:
    heroes = [b for b in graph.blocks if b.type == "hero"]
    grids = [b for b in graph.blocks if b.type == "product_grid"]
    return (len(heroes) == len(grids) == 1 and heroes[0].block_id == "qa-hero"
            and heroes[0].content.get("headline") == "FORGE SUPPLY / QA"
            and grids[0].block_id == "qa-products"
            and isinstance(grids[0].content.get("items"), list)
            and all(isinstance(i, dict) and isinstance(i.get("name"), str) for i in grids[0].content["items"])
            and sorted(i.get("name", "") for i in grids[0].content["items"] if isinstance(i, dict)) == sorted(PRODUCT_PHOTOS)
            and len(grids[0].content["items"]) == 3)


CSS = """@font-face{font-family:Barlow Condensed;src:url('__FONT__') format('truetype');font-weight:700;font-style:normal;font-display:swap}
*{box-sizing:border-box}html{scroll-behavior:auto}body{margin:0;background:#fff;color:#171a1f;font:18px/1.55 system-ui,sans-serif;letter-spacing:0}h1,h2,h3,p,figure{margin:0}h1,h2{font-family:Barlow Condensed,system-ui,sans-serif;font-weight:700;line-height:1.1}h1{font-size:72px;line-height:1}h2{font-size:40px}h3{font-size:24px;line-height:1.2;font-weight:600}p,dd,li,h1,h2,h3{overflow-wrap:anywhere}p{max-width:65ch}a{color:inherit}img{display:block;max-width:100%}
.inner{width:100%;max-width:1280px;margin:auto;padding-inline:40px}
.band{padding-block:80px}
.hero{position:relative;isolation:isolate;min-height:520px;display:flex;align-items:center;background:#f3f4f5}
.hero>.inner{margin-block:0}
.hero-photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 58%;z-index:-1}
.hero-copy{max-width:570px}
.hero h1{max-width:10ch}
.hero p{margin-top:24px;max-width:33ch}
.hero.with-photo{color:#fff}
.hero.with-photo .hero-copy{padding-block:48px}
.hero .cta{margin-top:32px}
.cta{display:inline-flex;align-items:center;justify-content:center;min-height:56px;padding:16px 24px;border:0;border-radius:4px;background:#d62839;color:white;font:600 16px/1.2 system-ui;text-decoration:none;text-align:center}
.cta:hover{background:#b81f30}
.cta:focus-visible{outline:3px solid #f4d94e;outline-offset:3px;box-shadow:0 0 0 7px #171a1f}
.section-head{border-top:6px solid #d62839;padding-top:24px;margin-bottom:32px}
.section-head p{margin-top:16px;color:#565d68}
.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px}
.product{border:1px solid #d7dbe0;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgb(23 26 31 / 6%);min-width:0}
.product:hover{box-shadow:0 8px 20px rgb(23 26 31 / 10%)}
.product img{width:100%;aspect-ratio:4/5;object-fit:cover;background:#f3f4f5}
.product-copy{padding:24px}
.product-copy p{margin-top:12px;color:#565d68}
.catalog-end{margin-top:32px}
.trust{background:#f3f4f5}
.trust-content{display:grid;grid-template-columns:1fr 2fr;gap:48px}
.trust dl{margin:0;display:grid;grid-template-columns:minmax(110px,1fr) 2fr;gap:16px 24px}
.trust dt{font-size:14px;color:#565d68}
.trust dd{margin:0}
.trust h3{margin-block:24px 12px}
.trust ul{padding-left:20px;margin:0}
.promotion{border-left:6px solid #d62839;padding-left:24px;margin-top:32px}
.promotion h3{margin-top:0}
.declared{font-size:14px;color:#565d68;margin-top:12px}
.footer{background:#171a1f;color:#fff;padding-block:48px}
.footer p{font-size:16px}
.mock-band{padding-block:24px;border-bottom:1px solid #d7dbe0}
.mock{display:flex;align-items:center;justify-content:space-between;gap:24px;border:1px solid #d7dbe0;border-radius:8px;padding:24px}
.mock h2{font-size:32px}
.mock p{font-size:14px;color:#565d68;margin-top:8px}
.mock button{display:inline-flex;align-items:center;justify-content:center;gap:12px;background:#f4d94e;color:#171a1f;min-height:56px;padding:16px 24px;border:0;border-radius:4px;font:600 16px/1.2 system-ui}
.mock button:disabled{cursor:not-allowed;opacity:1}
.mock svg{width:24px;height:24px;flex-shrink:0}
.credits{font-size:14px;color:#565d68;padding-block:24px}
.credits p{max-width:none}
.credits a:focus-visible{outline:3px solid #d62839;outline-offset:3px}
@media(max-width:1000px){.inner{padding-inline:24px}
.band{padding-block:56px}
.grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}
.trust-content{grid-template-columns:1fr;gap:32px}
.hero{min-height:500px}}
@media(max-width:600px){body{font-size:16px}
.inner{padding-inline:20px}
.band{padding-block:40px}h1{font-size:44px}h2{font-size:32px}h3{font-size:22px}
.hero{min-height:520px;align-items:flex-end}
.hero-photo{object-position:55% 65%}
.hero-copy{max-width:100%}
.hero h1{max-width:12ch}
.hero.with-photo .hero-copy{padding-block:32px}
.hero p{margin-top:16px;max-width:27ch}
.hero .cta{margin-top:24px}
.grid{grid-template-columns:1fr;gap:16px}
.trust dl{grid-template-columns:1fr;gap:8px}
.trust dd{margin-bottom:16px}
.mock{align-items:stretch;flex-direction:column;padding:20px}
.mock button{width:100%}
.footer{padding-block:40px}}
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto}}
"""


def _trust(content: dict) -> str:
    rows = []
    for key, label in (("phone", "Telefono"), ("whatsapp", "WhatsApp"), ("email", "Email"), ("address", "Direccion")):
        value = (content.get("contact") or {}).get(key)
        if value is not None:
            rows.append(f"<dt>{label}</dt><dd>{_text(value)}</dd>")
    if content.get("experience_years") is not None:
        rows.append(f'<dt>Anos de experiencia</dt><dd>{content["experience_years"]}</dd>')
    if content.get("guarantee") is not None:
        rows.append(f'<dt>Garantia</dt><dd>{_text(content["guarantee"])}</dd>')
    result = '<dl>' + ''.join(rows) + '</dl>' if rows else ''
    if content.get("certifications"):
        result += '<h3>Certificaciones</h3><ul>' + ''.join(f'<li>{_text(v)}</li>' for v in content['certifications']) + '</ul>'
    promotion = content.get("promotion")
    if promotion:
        result += '<div class="promotion"><h3>Promocion</h3><p>' + _text(promotion['text']) + '</p>'
        if promotion.get("valid_until"):
            result += '<p class="declared">Vigencia declarada: <time>' + _text(promotion['valid_until']) + '</time></p>'
        result += '</div>'
    return result


def render_bold_graph(graph: SiteGraph, fixture: str | None = None) -> str:
    if fixture is not None and (fixture != "hardware_qa" or not _fixture_matches(graph)):
        raise ValueError("Fixture mismatch")
    first_grid = next((b.block_id for b in graph.blocks if b.type == "product_grid"), None)
    sections = []
    has_h1 = False
    for block in graph.blocks:
        content = block.content
        attrs = f'id="{escape(block.block_id)}" data-block-type="{block.type}"'
        if block.type == "hero":
            heading = 'h2' if has_h1 else 'h1'
            has_h1 = True
            photo = f'<img class="hero-photo" src="{_asset("hero")}" alt="Manos usando una sierra sobre madera" width="1600" height="2400" fetchpriority="high">' if fixture else ''
            cta = f'<a class="cta" href="#{first_grid}">Ver productos</a>' if first_grid else ''
            sections.append(f'<header {attrs} class="hero{" with-photo" if fixture else ""}">{photo}<div class="inner"><div class="hero-copy"><{heading}>{_text(content.get("headline"))}</{heading}><p>{_text(content.get("subheadline"))}</p>{cta}</div></div></header>')
        elif block.type == "product_grid":
            items = content.get("items")
            cards = []
            for item in items if isinstance(items, list) else []:
                if not isinstance(item, dict):
                    continue
                photo = ''
                if fixture:
                    photo = f'<img src="{_asset(PRODUCT_PHOTOS[item["name"]])}" alt="{_text(item["name"])}" width="640" height="800" loading="lazy">'
                cards.append(f'<article class="product">{photo}<div class="product-copy"><h3>{_text(item.get("name"))}</h3><p>{_text(item.get("description"))}</p></div></article>')
            intro = f'<p>{_text(content.get("section_text"))}</p>' if content.get("section_text") else ''
            sections.append(f'<section {attrs} class="band"><div class="inner"><div class="section-head"><h2>{_text(content.get("heading"))}</h2>{intro}</div><div class="grid">{"".join(cards)}</div><a class="cta catalog-end" href="#{block.block_id}">Ver productos</a></div></section>')
        elif block.type == "trust_facts":
            details = _trust(content)
            if details:
                sections.append(f'<section {attrs} class="band trust"><div class="inner trust-content"><h2>Informacion del negocio</h2><div>{details}</div></div></section>')
        elif block.type == "footer":
            sections.append(f'<footer {attrs} class="footer"><div class="inner"><p>{_text(content.get("text"))}</p></div></footer>')
        else:
            cart = block.type == "cart_embed"
            title, label, icon = ('Carrito', 'Ver carrito', 'shopping-cart.svg') if cart else ('Checkout', 'Continuar al pago', 'credit-card.svg')
            svg = (ASSETS / icon).read_text(encoding='utf-8').replace('<svg', '<svg aria-hidden="true" focusable="false"', 1)
            sections.append(f'<aside {attrs} class="mock-band"><div class="inner"><div class="mock"><div><h2>{title}</h2><p>Vista de muestra - sin cobro</p></div><button type="button" disabled>{svg}{label}</button></div></div></aside>')
    if fixture:
        sections.append('<aside class="credits inner"><p>Fotografias del fixture QA: Thomas Marquize / Unsplash; Batholith y Chrislk02 / dominio publico; martillo de Shakespeare / <a href="https://creativecommons.org/licenses/by-sa/3.0/" rel="noreferrer">CC BY-SA 3.0</a> (<a href="https://commons.wikimedia.org/wiki/File:Claw_hammer-1.jpg" rel="noreferrer">original</a>, rotado, ajustado y comprimido; misma licencia).</p></aside>')
    css = CSS.replace('__FONT__', _asset('font'))
    return '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bold commerce | Internal graph preview</title><style>' + css + '</style></head><body><main>' + ''.join(sections) + '</main></body></html>'
