"""Lightweight URL reachability check (stdlib only; monkeypatch _head_status in tests)."""

from __future__ import annotations

import urllib.request
from urllib.parse import urlparse


def _head_status(url: str, timeout: float) -> int:
    req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": "Compound-LinkCheck/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:  # noqa: S310
        return resp.status


def verify_url(url: str | None, *, timeout: float = 6.0) -> tuple[str, float]:
    """Return ("OK"|"BROKEN"|"UNKNOWN", quality_score 0..1)."""
    if not url:
        return "UNKNOWN", 0.0
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        return "BROKEN", 0.0
    try:
        status = _head_status(url, timeout)
    except Exception:
        return "UNKNOWN", 0.3
    if 200 <= status < 400:
        return "OK", 0.9
    if status in (403, 405):
        return "OK", 0.6
    return "BROKEN", 0.0
