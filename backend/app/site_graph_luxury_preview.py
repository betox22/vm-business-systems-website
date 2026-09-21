"""Pure internal presentation; photographs are identity-bound synthetic QA assets."""
import base64
from functools import lru_cache
from html import escape
from pathlib import Path

from .site_graph_contract import SiteGraph

ASSETS = Path(__file__).with_name("site_graph_preview_assets") / "luxury_quiet"
ICONS = ASSETS.parent / "bold_commerce"
PRODUCT_PHOTOS = {"Jarron blanco": "vase", "Duo de recipientes con tapa": "jars"}
ASSET_FILES = {"font": ("CormorantGaramond-Medium.otf", "font/otf"),
               **{name: (name + ".webp", "image/webp") for name in ("hero", "vase", "jars")}}


@lru_cache(maxsize=4)
def _asset(name: str) -> str:
    filename, mime = ASSET_FILES[name]
    return f"data:{mime};base64," + base64.b64encode((ASSETS / filename).read_bytes()).decode("ascii")


def _text(value) -> str:
    return escape(value if isinstance(value, str) else "")


def _fixture_matches(graph: SiteGraph) -> bool:
    heroes = [b for b in graph.blocks if b.type == "hero"]
    grids = [b for b in graph.blocks if b.type == "product_grid"]
    return (len(heroes) == len(grids) == 1
            and heroes[0].block_id == "objects-hero"
            and heroes[0].content.get("headline") == "UMBRAL / QA"
            and grids[0].block_id == "objects-products"
            and isinstance(grids[0].content.get("items"), list)
            and all(isinstance(i, dict) and isinstance(i.get("name"), str) for i in grids[0].content["items"])
            and sorted(i["name"] for i in grids[0].content["items"]) == sorted(PRODUCT_PHOTOS))


CSS = """@font-face{font-family:Cormorant Garamond;src:url('__FONT__') format('opentype');font-weight:500;font-style:normal;font-display:swap}
*{box-sizing:border-box}html{scroll-behavior:auto}body{margin:0;background:#f5f5f2;color:#20221f;font:18px/1.6 system-ui,sans-serif;letter-spacing:0}h1,h2,h3,p,figure{margin:0}h1,h2,h3{font-family:Cormorant Garamond,Georgia,serif;font-weight:500;overflow-wrap:anywhere}h1{font-size:80px;line-height:1.05;letter-spacing:0}h2{font-size:44px;line-height:1.15}h3{font-size:28px;line-height:1.2}p,dd,li,a{overflow-wrap:anywhere}p{max-width:62ch}a{color:inherit}img{display:block;max-width:100%}
.inner{width:100%;max-width:1280px;margin:auto;padding-inline:48px}.band{padding-block:112px}
.hero{position:relative;isolation:isolate;min-height:min(560px,80svh);display:flex;align-items:center;background:#f5f5f2}.hero>.inner{margin-block:0}.hero-photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 56%;z-index:-1}.hero-copy{max-width:600px;padding-block:72px}.hero p{margin-top:24px;max-width:28ch}.hero .cta{margin-top:32px}
.cta{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:14px 24px;border:0;border-radius:2px;background:#4f584b;color:#f5f5f2;font:600 16px/1.3 system-ui,sans-serif;text-decoration:none;text-align:center}.cta:hover{background:#3b4238}a:focus-visible{outline:3px solid #20221f;outline-offset:4px}
.section-head{margin-bottom:48px;display:flex;justify-content:space-between;align-items:baseline;gap:32px}.section-head p{color:#5c6258;max-width:30ch}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:40px}.product{min-width:0}.product img{width:100%;height:auto;aspect-ratio:4/5;object-fit:cover;object-position:50% 75%}.product img.jars{object-position:50% 100%}.product-copy{padding-top:24px}.product-copy p{margin-top:12px;color:#5c6258}
.trust{background:#20221f;color:#f5f5f2}.trust-content{display:grid;grid-template-columns:1fr 2fr;gap:72px}.trust dl{margin:0;display:grid;grid-template-columns:minmax(100px,1fr) 2fr;gap:24px}.trust dt{font:400 14px/1.6 system-ui,sans-serif;color:#bfc3ba}.trust dd{margin:0}.trust h3{margin-block:32px 16px}.trust ul{padding-left:20px;margin:0}.promotion{border-top:1px solid #bfc3ba;padding-top:32px;margin-top:32px}.promotion h3{margin-top:0}.declared{font-size:14px;color:#bfc3ba;margin-top:12px}
.footer{background:#20221f;color:#f5f5f2;padding-block:48px}.footer p{font-size:16px}.mock-band{padding-block:24px}.mock{display:flex;align-items:center;justify-content:space-between;gap:24px;border:1px solid #d7d9d1;border-radius:4px;padding:24px}.mock h2{font-size:32px}.mock p{font-size:14px;color:#5c6258;margin-top:8px}.mock button{display:inline-flex;align-items:center;justify-content:center;gap:12px;min-height:48px;padding:14px 24px;border:0;border-radius:2px;background:#4f584b;color:#f5f5f2;font:600 16px/1.3 system-ui,sans-serif}.mock button:disabled{cursor:not-allowed;opacity:1}.mock svg{width:24px;height:24px;flex-shrink:0}.credits{font-size:14px;color:#5c6258;padding-block:24px}.credits p{max-width:none}
@media(max-width:1000px){.inner{padding-inline:28px}.band{padding-block:72px}h1{font-size:60px}.hero-copy{max-width:480px}.section-head{display:block}.section-head p{margin-top:16px}.trust-content{grid-template-columns:1fr;gap:40px}}
@media(max-width:600px){body{font-size:16px}.inner{padding-inline:20px}.band{padding-block:48px}h1{font-size:44px}h2{font-size:32px}h3{font-size:26px}.hero{min-height:min(620px,82svh);align-items:flex-start}.hero-photo{object-position:75% 50%}.hero-copy{max-width:100%;padding-block:40px}.hero h1{max-width:none}.hero p{margin-top:16px;max-width:32ch}.hero .cta{margin-top:24px}.section-head{margin-bottom:32px}.grid{grid-template-columns:1fr;gap:40px}.trust dl{grid-template-columns:1fr;gap:8px}.trust dd{margin-bottom:16px}.mock{flex-direction:column;align-items:stretch;padding:20px}.mock button{width:100%}.footer{padding-block:40px}}
@media(max-width:360px){h1{font-size:40px}}
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


def render_luxury_graph(graph: SiteGraph, fixture: str | None = None) -> str:
    if fixture is not None and (fixture != "objects_qa" or not _fixture_matches(graph)):
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
            photo = f'<img class="hero-photo" src="{_asset("hero")}" alt="Jarron de vidrio con flores secas sobre una mesa" width="1800" height="1202" fetchpriority="high">' if fixture else ''
            cta = f'<a class="cta" href="#{first_grid}">Ver coleccion</a>' if first_grid else ''
            sections.append(f'<header {attrs} class="hero">{photo}<div class="inner"><div class="hero-copy"><{heading}>{_text(content.get("headline"))}</{heading}><p>{_text(content.get("subheadline"))}</p>{cta}</div></div></header>')
        elif block.type == "product_grid":
            items = content.get("items")
            cards = []
            for item in items if isinstance(items, list) else []:
                if not isinstance(item, dict):
                    continue
                photo = ''
                if fixture:
                    name = PRODUCT_PHOTOS[item['name']]
                    photo = f'<img class="{name}" src="{_asset(name)}" alt="{_text(item["name"])}" width="900" height="1350" loading="lazy">'
                cards.append(f'<article class="product">{photo}<div class="product-copy"><h3>{_text(item.get("name"))}</h3><p>{_text(item.get("description"))}</p></div></article>')
            intro = f'<p>{_text(content.get("section_text"))}</p>' if content.get("section_text") else ''
            sections.append(f'<section {attrs} class="band"><div class="inner"><div class="section-head"><h2>{_text(content.get("heading"))}</h2>{intro}</div><div class="grid">{"".join(cards)}</div></div></section>')
        elif block.type == "trust_facts":
            details = _trust(content)
            if details:
                sections.append(f'<section {attrs} class="band trust"><div class="inner trust-content"><h2>Informacion del negocio</h2><div>{details}</div></div></section>')
        elif block.type == "footer":
            sections.append(f'<footer {attrs} class="footer"><div class="inner"><p>{_text(content.get("text"))}</p></div></footer>')
        else:
            title, label, icon = ('Carrito', 'Ver carrito', 'shopping-cart.svg') if block.type == 'cart_embed' else ('Checkout', 'Continuar al pago', 'credit-card.svg')
            svg = (ICONS / icon).read_text(encoding='utf-8').replace('<svg', '<svg aria-hidden="true" focusable="false"', 1)
            sections.append(f'<aside {attrs} class="mock-band"><div class="inner"><div class="mock"><div><h2>{title}</h2><p>Vista de muestra - sin cobro</p></div><button type="button" disabled>{svg}{label}</button></div></div></aside>')
    if fixture:
        sections.append('<aside class="credits inner"><p>Fotografias QA: <a href="https://unsplash.com/photos/Yk_7RscELJE" rel="noreferrer">Weronika Karczewska</a>, <a href="https://unsplash.com/photos/a0rE64YJDA4" rel="noreferrer">Linh Le</a> y <a href="https://unsplash.com/photos/7jGvCol0Cz4" rel="noreferrer">Anya Chernykh</a> / Unsplash.</p></aside>')
    css = CSS.replace('__FONT__', _asset('font'))
    return '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Luxury quiet | Internal graph preview</title><style>' + css + '</style></head><body><main>' + ''.join(sections) + '</main></body></html>'
