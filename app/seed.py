from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Order, OrderItem, Product, StoreCustomer, StorePage, Tenant


def seed_demo_data(db: Session) -> None:
    existing = db.scalar(select(Tenant).where(Tenant.subdomain == "tienda1"))
    if existing:
        return

    tenant = Tenant(
        name="Tienda Demo",
        subdomain="tienda1",
        custom_domain="mitienda.com",
    )
    db.add(tenant)
    db.flush()

    products = [
        Product(
            tenant_id=tenant.id,
            name="Cafe premium",
            price=12.5,
            image_url="https://images.unsplash.com/photo-1447933601403-0c6688de566e",
        ),
        Product(
            tenant_id=tenant.id,
            name="Taza artesanal",
            price=9.99,
            image_url="https://images.unsplash.com/photo-1514228742587-6b1558fcca3d",
        ),
    ]
    db.add_all(products)
    db.flush()

    customer = StoreCustomer(
        tenant_id=tenant.id,
        name="Daniela M.",
        phone="+584121234567",
        email="daniela@example.com",
        address="Caracas, Venezuela",
    )
    db.add(customer)
    db.flush()

    order = Order(
        tenant_id=tenant.id,
        customer_id=customer.id,
        order_number="ORD-1001",
        status="new",
        payment_status="pending",
        total=34.99,
        notes="Entregar despues de las 4pm.",
    )
    db.add(order)
    db.flush()

    db.add_all(
        [
            OrderItem(
                order_id=order.id,
                product_id=products[0].id,
                name=products[0].name,
                quantity=2,
                unit_price=12.5,
            ),
            OrderItem(
                order_id=order.id,
                product_id=products[1].id,
                name=products[1].name,
                quantity=1,
                unit_price=9.99,
            ),
        ]
    )

    db.add_all(
        [
            StorePage(
                tenant_id=tenant.id,
                title="Home",
                slug="/",
                page_type="home",
                status="published",
                config={"sections": ["Hero", "ProductGrid", "Footer"]},
            ),
            StorePage(
                tenant_id=tenant.id,
                title="Catalogo",
                slug="/catalogo",
                page_type="catalog",
                status="published",
                config={"sections": ["ProductGrid"]},
            ),
            StorePage(
                tenant_id=tenant.id,
                title="Contacto",
                slug="/contacto",
                page_type="contact",
                status="draft",
                config={"sections": ["Footer"]},
            ),
        ]
    )
    db.commit()
