from app.auth import make_token, verify_password, verify_token


def test_auth_disabled_without_password(monkeypatch):
    monkeypatch.setattr("app.auth.settings.app_password", None)
    assert verify_password("anything") is True
    assert verify_token(None) is True


def test_auth_with_password(monkeypatch):
    monkeypatch.setattr("app.auth.settings.app_password", "secret-pass")
    assert verify_password("secret-pass") is True
    assert verify_password("wrong") is False
    token = make_token()
    assert verify_token(token) is True
    assert verify_token("bad-token") is False
