from app.models import ProjectState
from app.orchestrator import assistant_message_for_state


def test_ready_message_sounds_client_facing_instead_of_leaking_copy_policy():
    state = ProjectState(
        businessName="Bath All Day",
        selectedLanguage="es",
        selectedTemplateName="Mega Retail Store",
    )

    message = assistant_message_for_state(state)

    assert "elegí Mega Retail Store como punto de partida" in message
    assert "copy público" not in message
    assert "no copiar tus notas" not in message
