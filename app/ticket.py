from html import escape

from .schemas import TicketRequest


def render_thermal_ticket_html(order: TicketRequest) -> str:
    rows = "\n".join(
        _render_product_row(product.name, product.quantity, product.unit_price)
        for product in order.products
    )
    notes = (
        f"<section class=\"notes\"><strong>Notas</strong><p>{escape(order.notes)}</p></section>"
        if order.notes
        else ""
    )

    return f"""<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Ticket {escape(order.business_name)}</title>
  <style>
    @page {{ size: 80mm auto; margin: 0; }}
    * {{ box-sizing: border-box; }}
    body {{
      width: 80mm;
      margin: 0;
      padding: 3mm;
      color: #111;
      background: #fff;
      font-family: Arial, "Helvetica Neue", sans-serif;
      font-size: 11px;
      line-height: 1.28;
    }}
    h1 {{ margin: 0 0 2mm; text-align: center; font-size: 16px; }}
    .meta, .notes {{ border-top: 1px dashed #111; padding-top: 2mm; margin-top: 2mm; }}
    .row {{ display: grid; grid-template-columns: 1fr 9mm 18mm; gap: 2mm; padding: 1mm 0; }}
    .row.header {{ border-bottom: 1px dashed #111; font-weight: 700; }}
    .qty, .money {{ text-align: right; }}
    .total {{ border-top: 1px dashed #111; margin-top: 2mm; padding-top: 2mm; display: flex; justify-content: space-between; font-size: 15px; font-weight: 800; }}
    p {{ margin: 1mm 0 0; }}
  </style>
</head>
<body>
  <h1>{escape(order.business_name)}</h1>
  <section class="meta">
    <div><strong>Cliente:</strong> {escape(order.customer)}</div>
  </section>
  <section>
    <div class="row header"><span>Producto</span><span class="qty">Cant.</span><span class="money">Total</span></div>
    {rows}
  </section>
  <section class="total"><span>Total</span><span>{order.total:.2f}</span></section>
  {notes}
</body>
</html>"""


def _render_product_row(name: str, quantity: int, unit_price: float) -> str:
    line_total = quantity * unit_price
    return (
        "<div class=\"row\">"
        f"<span>{escape(name)}</span>"
        f"<span class=\"qty\">{quantity}</span>"
        f"<span class=\"money\">{line_total:.2f}</span>"
        "</div>"
    )
