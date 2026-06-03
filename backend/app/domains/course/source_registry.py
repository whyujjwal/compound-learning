"""Allowlist of reputable open-source learning hosts."""

from __future__ import annotations

from urllib.parse import urlparse

_SOURCES: dict[str, tuple[str, str]] = {
    "ocw.mit.edu": ("MIT OpenCourseWare", "CC BY-NC-SA"),
    "youtube.com": ("YouTube", "Standard YouTube"),
    "youtu.be": ("YouTube", "Standard YouTube"),
    "arxiv.org": ("arXiv", "arXiv"),
    "github.com": ("GitHub", "See repo"),
    "freecodecamp.org": ("freeCodeCamp", "CC BY-SA"),
    "khanacademy.org": ("Khan Academy", "CC BY-NC-SA"),
    "3blue1brown.com": ("3Blue1Brown", "Standard"),
    "coursera.org": ("Coursera", "Coursera Terms"),
    "leetcode.com": ("LeetCode", "LeetCode Terms"),
    "developer.mozilla.org": ("MDN Web Docs", "CC BY-SA"),
    "wikipedia.org": ("Wikipedia", "CC BY-SA"),
    "huggingface.co": ("Hugging Face", "Apache-2.0 / varies"),
    "docs.python.org": ("Python Docs", "PSF"),
    "refactoring.guru": ("Refactoring Guru", "Standard"),
}


def classify_source(url: str | None) -> tuple[str | None, str | None, bool]:
    """Return (provider, license, trusted)."""
    if not url:
        return None, None, False
    host = (urlparse(url).netloc or "").lower().removeprefix("www.")
    for suffix, (provider, license_name) in _SOURCES.items():
        if host == suffix or host.endswith("." + suffix) or host.endswith(suffix):
            return provider, license_name, True
    return None, None, False
