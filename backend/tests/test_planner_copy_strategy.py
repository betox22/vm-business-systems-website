from app.ai_site_planner import OpenAISitePlanAgent, state_to_client_summary
from app.models import ProjectState


def test_planner_prompt_requires_specific_direct_response_copy() -> None:
    prompt = OpenAISitePlanAgent._system_prompt()

    assert "senior direct-response copywriter and brand strategist" in prompt
    assert "COPY QUALITY GATE (hard validity requirement)" in prompt
    assert "Run a silent specificity check before returning" in prompt
    assert "MUST name at least one offering from that list" in prompt
    assert "Structure the hero with AIDA" in prompt
    assert "PAS may guide the hero or problem section" in prompt
    assert "could not be pasted unchanged onto an unrelated competitor" in prompt
    assert "MUST name at least one real offering" in prompt
    assert "Never invent awards, customer counts, percentages, guarantees" in prompt
    assert "Never describe products as natural, organic, sustainable" in prompt
    assert '"solutions tailored to your needs"' in prompt
    assert '"Streamline your..."' in prompt
    assert 'Never use vague buttons such as "Learn more"' in prompt


def test_copy_strategy_receives_distinct_verified_facts_for_bath_and_b2b() -> None:
    bath = ProjectState(
        businessName="Bath All Day",
        businessDescription="Small-batch bath products for a calmer nightly routine.",
        industry="handmade bath and body",
        servicesProducts=["lavender bath bombs", "soy candles", "oat milk soap"],
        salesFlow="online_sales",
        preferredTone="warm premium",
    )
    b2b = ProjectState(
        businessName="NexusOps",
        businessDescription=(
            "B2B operations software for regional logistics companies that need "
            "inventory, field teams, and SLA reporting in one place."
        ),
        industry="B2B logistics SaaS",
        servicesProducts=[
            "real-time operations dashboard",
            "inventory exception alerts",
            "SLA reporting automation",
        ],
        salesFlow="lead_capture",
        preferredTone="confident modern",
    )

    bath_summary = state_to_client_summary(bath, "Build the store around the nightly ritual.")
    b2b_summary = state_to_client_summary(b2b, "Build a lead-generation SaaS site.")

    assert bath_summary["businessName"] == "Bath All Day"
    assert bath_summary["servicesProducts"] == [
        "lavender bath bombs",
        "soy candles",
        "oat milk soap",
    ]
    assert b2b_summary["businessName"] == "NexusOps"
    assert b2b_summary["servicesProducts"] == [
        "real-time operations dashboard",
        "inventory exception alerts",
        "SLA reporting automation",
    ]
    assert bath_summary != b2b_summary
