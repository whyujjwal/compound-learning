from app.services.auth_service import (
    make_legacy_token,
    verify_legacy_password,
    verify_legacy_token,
)


def test_auth_disabled_without_password(monkeypatch):
    monkeypatch.setattr("app.services.auth_service.settings.app_password", None)
    assert verify_legacy_password("anything") is True
    assert verify_legacy_token(None) is True


def test_auth_with_password(monkeypatch):
    monkeypatch.setattr("app.services.auth_service.settings.app_password", "secret-pass")
    assert verify_legacy_password("secret-pass") is True
    assert verify_legacy_password("wrong") is False
    token = make_legacy_token()
    assert verify_legacy_token(token) is True
    assert verify_legacy_token("bad-token") is False
