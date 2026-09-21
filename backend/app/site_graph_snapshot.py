"""Full storage identity, including rows that a commerce overlay would omit."""
import hashlib
import json

from sqlalchemy import select

from .db_models import GeneratedSite, Product


def storage_snapshot(session, site_id):
    site = session.execute(select(GeneratedSite).where(GeneratedSite.id == site_id)
                           .execution_options(populate_existing=True)).scalar_one()
    products = session.scalars(select(Product).where(Product.site_id == site_id)
                               .order_by(Product.id).execution_options(populate_existing=True)).all()
    def row_values(row):
        return {column.name: getattr(row, column.name) for column in row.__table__.columns}
    value = {"site": row_values(site), "products": [row_values(row) for row in products]}
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":"),
                                    ensure_ascii=False, allow_nan=False).encode()).hexdigest()
