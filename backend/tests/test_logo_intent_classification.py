from app import main
from app.lyra_intake_engine import classify_logo_intent_text
from app.models import LumaChatRequest, ProjectState


def test_continue_without_logo_wins_before_generation_detection():
    exact = "No tengo logo y prefiero continuar sin logo"
    assert classify_logo_intent_text(exact) == "explicit_skip"

    state = ProjectState()
    main.apply_current_step_hint(
        state,
        LumaChatRequest(message=exact, currentStep="hasLogoPhotos"),
    )

    assert state.logoPreference == "text_only"
    assert state.logoBrief is None
    assert state.logoGenerationStatus is None


def test_logo_skip_variants_are_not_generation_requests():
    variants = [
        "Prefiero seguir sin logo de momento.",
        "Continuemos sin un logo por ahora.",
        "I want to continue without a logo for now.",
    ]
    assert all(classify_logo_intent_text(value) == "explicit_skip" for value in variants)


def test_explicit_logo_generation_and_initials_remain_supported():
    request = "Quiero que diseñes un logo con las iniciales BAD"
    assert classify_logo_intent_text(request) == "wants_generated"
    assert main.logo_initials_requested(request) is True
    assert main.logo_initials_requested("No tengo logo y prefiero continuar sin logo") is False
