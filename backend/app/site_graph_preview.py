"""Escaped, script-free verification renderer; never used by public site-viewer."""
from html import escape

from .site_graph_contract import SiteGraph


def render_graph(graph: SiteGraph, pattern: str | None = None, fixture: str | None = None) -> str:
    if pattern == "bold_commerce":
        from .site_graph_bold_preview import render_bold_graph
        return render_bold_graph(graph, fixture)
    if pattern is not None or fixture is not None:
        raise ValueError("Unknown preview presentation")
    sections = []
    def text(value):
        return escape(value if isinstance(value, str) else "")
    for block in graph.blocks:
        content = block.content
        attrs = f'id="{block.block_id}" data-block-type="{block.type}"'
        if block.type == "hero":
            sections.append(f'<header {attrs}><h1>{text(content.get("headline"))}</h1><p>{text(content.get("subheadline"))}</p></header>')
        elif block.type == "product_grid":
            items = content.get("items", [])
            cards = "".join(f'<article><h3>{text(i.get("name"))}</h3><p>{text(i.get("description"))}</p></article>'
                            for i in (items if isinstance(items, list) else []) if isinstance(i, dict))
            section_text = text(content.get("section_text"))
            intro = f"<p>{section_text}</p>" if section_text else ""
            sections.append(f'<section {attrs}><h2>{text(content.get("heading"))}</h2>{intro}<div class="grid">{cards}</div></section>')
        elif block.type == "footer":
            sections.append(f'<footer {attrs}>{text(content.get("text"))}</footer>')
        elif block.type == "trust_facts":
            rows = []
            contact = content.get("contact") or {}
            for key, label in (("phone", "Phone"), ("whatsapp", "WhatsApp"), ("email", "Email"), ("address", "Address")):
                if contact.get(key) is not None:
                    rows.append(f'<dt>{label}</dt><dd>{text(contact[key])}</dd>')
            if content.get("experience_years") is not None:
                rows.append(f'<dt>Years of experience</dt><dd>{content["experience_years"]}</dd>')
            if content.get("guarantee") is not None:
                rows.append(f'<dt>Guarantee</dt><dd>{text(content["guarantee"])}</dd>')
            details = '<dl>' + ''.join(rows) + '</dl>' if rows else ''
            certificates = content.get("certifications") or []
            if certificates:
                details += '<h3>Certifications</h3><ul>' + ''.join(f'<li>{text(item)}</li>' for item in certificates) + '</ul>'
            promotion = content.get("promotion")
            if promotion:
                details += f'<h3>Promotion</h3><p>{text(promotion["text"])}</p>'
                if promotion.get("valid_until"):
                    details += f'<p>Declared valid until: <time>{text(promotion["valid_until"])}</time></p>'
            if details:
                sections.append(f'<section {attrs}><h2>Business information</h2>{details}</section>')
        else:
            sections.append(f'<aside {attrs}>Fixed module reference: {text(content["module"])} (not executed in preview)</aside>')
    # No public scripts: even fixed embeds must not initialize commerce in this harness.
    return '''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Internal graph preview</title><style>
body{margin:0;font:16px/1.6 system-ui;color:#18252b;background:#fafafa}main{max-width:1100px;margin:auto;padding:32px}
header{padding:48px 0;border-bottom:2px solid #087f83}h1{font-size:48px;line-height:1.15;margin:0}section{padding:32px 0}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:24px}article{border:1px solid #d4dddd;border-radius:8px;padding:24px;background:white}
footer,aside{padding:24px 0;border-top:1px solid #d4dddd}aside{color:#526168}@media(max-width:500px){h1{font-size:32px}main{padding:20px}}
</style><main>''' + "".join(sections) + "</main></html>"
