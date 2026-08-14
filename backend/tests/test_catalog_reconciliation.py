from app.ai_site_planner import _matching_catalog_item, _reconcile_client_catalog


def _model_item(name: str, category: str, description: str, price: float, query: str) -> dict:
    return {
        "id": f"model-{name}",
        "sku": f"MODEL-{name}",
        "name": name,
        "category": category,
        "description": description,
        "price": price,
        "price_amount": price,
        "currency": "USD",
        "rating": 4.8,
        "badge": "Model generated",
        "imageSearchQuery": query,
    }


def _seed_item(index: int, name: str = "Unrelated seed") -> dict:
    price = 10.0 + index
    return {
        "id": f"seed-{index}",
        "sku": f"SEED-{index}",
        "name": name,
        "category": f"Seed category {index}",
        "description": f"Seed description {index}",
        "price": price,
        "price_amount": price,
        "currency": "USD",
        "rating": 4.1,
        "badge": "Seed",
        "imageSearchQuery": f"seed query {index}",
    }


MI_MUNDO_CONTEXT = (
    "Mi Mundo 3D vende impresoras 3D, accesorios para impresoras 3D, "
    "materiales y equipos para imprimir, y cursos online."
)


def test_mi_mundo_3d_fused_planner_item_remains_ai_generated() -> None:
    client_names = [
        "Impresoras 3D",
        "Accesorios para impresoras 3D",
        "Materiales",
        "Equipos para imprimir",
        "Cursos online de como hacer los productos",
    ]
    catalog_items = [
        _model_item(
            "Impresora 3D profesional",
            "Impresoras 3D",
            "Equipo de precisión para fabricar piezas y prototipos en 3D.",
            799.99,
            "advanced 3D printer",
        ),
        _model_item(
            "Kit de accesorios para impresoras 3D",
            "Accesorios para impresoras",
            "Boquillas, herramientas y repuestos para impresoras 3D.",
            49.99,
            "3D printer accessories kit",
        ),
        _model_item(
            "Materiales y equipos para imprimir",
            "Materiales y equipos de impresión 3D",
            "Filamentos, resinas y equipos para imprimir productos en 3D.",
            89.99,
            "3D printing materials and equipment",
        ),
        _model_item(
            "Curso online de impresión 3D",
            "Cursos online",
            "Curso para aprender a diseñar y fabricar productos con impresión 3D.",
            149.99,
            "3D printing online course",
        ),
    ]
    seeds = [_seed_item(index) for index in range(6)]

    reconciled, used_seed_fallback = _reconcile_client_catalog(
        catalog_items,
        seeds,
        client_names,
        MI_MUNDO_CONTEXT,
        "Mi Mundo 3D",
    )

    assert used_seed_fallback is False
    assert [item["name"] for item in reconciled] == client_names
    assert all(not item["category"].startswith("Seed category") for item in reconciled)
    assert all(not item["description"].startswith("Seed description") for item in reconciled)
    assert all(float(item["price"]) not in {10.0, 11.0, 12.0, 13.0, 14.0, 15.0} for item in reconciled)


def test_mi_mundo_3d_literal_english_fixture_catalog_reconciles() -> None:
    client_names = [
        "Impresoras 3D",
        "Accesorios para impresoras 3D",
        "Materiales",
        "Equipos para imprimir",
        "Cursos online de como hacer los productos",
    ]
    # Literal planner products captured in
    # mi_mundo_3d_website_builder_seed_fallback_evidence.json.
    catalog_items = [
        _model_item(
            "Ultimaker S3 3D Printer",
            "3D Printers",
            "Professional dual extrusion 3D printer for reliable prototypes.",
            3999.99,
            "Ultimaker S3 3D Printer",
        ),
        _model_item(
            "3D Printer Filament PLA",
            "Printing Materials",
            "PLA filament material for detailed 3D printing projects.",
            29.99,
            "PLA filament for 3D printing",
        ),
        _model_item(
            "3D Printer Nozzle Kit",
            "3D Printer Accessories",
            "Nozzle equipment kit with tools for 3D printer maintenance.",
            49.99,
            "3D printer nozzle kit",
        ),
        _model_item(
            "3D Printing Basics Online Course",
            "Online Courses",
            "Online course teaching the basics of designing and printing products.",
            199.99,
            "3D printing online course",
        ),
    ]

    reconciled, used_seed_fallback = _reconcile_client_catalog(
        catalog_items,
        [_seed_item(index) for index in range(6)],
        client_names,
        MI_MUNDO_CONTEXT,
        "Mi Mundo 3D",
    )

    assert used_seed_fallback is False
    assert [item["name"] for item in reconciled] == client_names
    assert all(not item["category"].startswith("Seed category") for item in reconciled)


def test_two_client_offerings_can_share_one_fused_model_item() -> None:
    model_item = _model_item(
        "Materiales y equipos para imprimir",
        "Suministros de impresión 3D",
        "Filamentos, resinas y equipos para impresión de piezas.",
        89.99,
        "3D printing materials equipment",
    )

    reconciled, used_seed_fallback = _reconcile_client_catalog(
        [model_item],
        [],
        ["Materiales", "Equipos para imprimir"],
        MI_MUNDO_CONTEXT,
        "Mi Mundo 3D",
    )

    assert used_seed_fallback is False
    assert len(reconciled) == 2
    assert {item["category"] for item in reconciled} == {"Suministros de impresión 3D"}
    assert {item["description"] for item in reconciled} == {
        "Filamentos, resinas y equipos para impresión de piezas."
    }


def test_padding_to_four_items_does_not_mark_batch_as_seed_fallback() -> None:
    clients = ["Reparación de bicicletas", "Mantenimiento de bicicletas"]
    model_items = [
        _model_item(
            "Reparación de bicicletas",
            "Taller",
            "Diagnóstico y reparación profesional de bicicletas.",
            75.0,
            "bicycle repair service",
        ),
        _model_item(
            "Mantenimiento de bicicletas",
            "Taller",
            "Ajuste preventivo y mantenimiento completo.",
            55.0,
            "bicycle maintenance service",
        ),
    ]

    reconciled, used_seed_fallback = _reconcile_client_catalog(
        model_items,
        [_seed_item(index, f"Padding {index}") for index in range(4)],
        clients,
        "taller de bicicletas con reparación y mantenimiento",
        "Bici Taller",
    )

    assert used_seed_fallback is False
    assert len(reconciled) == 4
    assert [item["name"] for item in reconciled[:2]] == clients


def test_unrelated_model_catalog_still_reports_seed_fallback() -> None:
    model_items = [
        _model_item(
            "Chaqueta urbana oversize",
            "Moda urbana",
            "Chaqueta de temporada para looks streetwear.",
            120.0,
            "urban fashion jacket",
        ),
        _model_item(
            "Zapatillas streetwear",
            "Calzado",
            "Zapatillas modernas para moda urbana.",
            95.0,
            "streetwear sneakers",
        ),
    ]

    reconciled, used_seed_fallback = _reconcile_client_catalog(
        model_items,
        [_seed_item(0, "Servicio de reparación")],
        ["Reparación de bicicletas"],
        "taller especializado en reparación de bicicletas",
        "Bici Taller",
    )

    assert used_seed_fallback is True
    assert reconciled[0]["category"] == "Seed category 0"


def test_ambiguous_single_token_does_not_match_unrelated_office_materials() -> None:
    office_item = _model_item(
        "Materiales de oficina",
        "Papelería",
        "Cuadernos, carpetas y suministros para oficinas.",
        25.0,
        "office stationery supplies",
    )

    matched, matched_index = _matching_catalog_item(
        "Materiales",
        [office_item],
        set(),
        context=MI_MUNDO_CONTEXT,
    )

    assert matched is None
    assert matched_index is None


def test_equipment_offering_does_not_reuse_course_just_for_printing_word() -> None:
    course_item = _model_item(
        "Curso online de impresión 3D",
        "Cursos",
        "Aprende los fundamentos para imprimir productos en 3D.",
        99.99,
        "online 3D printing course",
    )

    matched, matched_index = _matching_catalog_item(
        "Equipos para imprimir",
        [course_item],
        set(),
        allow_used=True,
        context=MI_MUNDO_CONTEXT,
    )

    assert matched is None
    assert matched_index is None
