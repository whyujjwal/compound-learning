"""Lightweight research helpers for roadmap generation.

Uses public GitHub search and optional URL fetching — no API keys required.
Failures are swallowed so generation can continue without external data.
"""

from __future__ import annotations

import logging
import re
from html import unescape
from typing import Any

import httpx

logger = logging.getLogger("compound.research")

_GITHUB_SEARCH = "https://api.github.com/search/repositories"
_HTTP_TIMEOUT = 12.0
_MAX_REPOS = 5


def search_github_repos(query: str, *, limit: int = _MAX_REPOS) -> list[dict[str, Any]]:
    """Search GitHub for popular repos matching a learning topic."""
    q = f"{query} stars:>50"
    try:
        with httpx.Client(timeout=_HTTP_TIMEOUT, follow_redirects=True) as client:
            resp = client.get(
                _GITHUB_SEARCH,
                params={"q": q, "sort": "stars", "order": "desc", "per_page": limit},
                headers={
                    "Accept": "application/vnd.github+json",
                    "User-Agent": "compound-learning-app",
                },
            )
            if resp.status_code != 200:
                logger.warning("GitHub search failed: %s %s", resp.status_code, resp.text[:200])
                return []
            items = resp.json().get("items") or []
            return [
                {
                    "full_name": item.get("full_name"),
                    "url": item.get("html_url"),
                    "description": (item.get("description") or "")[:240],
                    "stars": item.get("stargazers_count"),
                    "topics": item.get("topics") or [],
                }
                for item in items[:limit]
            ]
    except Exception as e:
        logger.warning("GitHub search error: %s", e)
        return []


def fetch_url_text(url: str, *, max_chars: int = 3500) -> str:
    """Fetch a public URL and return a plain-text excerpt."""
    if not url or not url.startswith(("http://", "https://")):
        return ""
    try:
        with httpx.Client(timeout=_HTTP_TIMEOUT, follow_redirects=True) as client:
            resp = client.get(
                url,
                headers={"User-Agent": "compound-learning-app", "Accept": "text/html,application/json,text/plain"},
            )
            if resp.status_code != 200:
                return ""
            text = resp.text
            if "application/json" in (resp.headers.get("content-type") or ""):
                return text[:max_chars]
            text = re.sub(r"(?is)<script.*?>.*?</script>", " ", text)
            text = re.sub(r"(?is)<style.*?>.*?</style>", " ", text)
            text = re.sub(r"(?is)<[^>]+>", " ", text)
            text = unescape(re.sub(r"\s+", " ", text)).strip()
            return text[:max_chars]
    except Exception as e:
        logger.warning("URL fetch error for %s: %s", url, e)
        return ""


def gather_track_research(track_name: str, goals: str) -> str:
    """Build a research brief for one track using GitHub + optional README fetch."""
    queries = [
        f"{track_name} awesome",
        f"{track_name} tutorial",
        f"{track_name} learning resources",
    ]
    seen: set[str] = set()
    lines: list[str] = [f"Research for track: {track_name}", f"Learner goals context: {goals[:400]}"]

    for q in queries:
        for repo in search_github_repos(q, limit=3):
            url = repo.get("url") or ""
            if not url or url in seen:
                continue
            seen.add(url)
            desc = repo.get("description") or ""
            stars = repo.get("stars") or 0
            lines.append(f"- GitHub: {repo.get('full_name')} ({stars}★) — {url}")
            if desc:
                lines.append(f"  {desc}")

    # Pull README from the top repo when available.
    if seen:
        top_url = next(iter(seen))
        if "github.com" in top_url:
            parts = top_url.rstrip("/").split("/")
            if len(parts) >= 2:
                owner, repo = parts[-2], parts[-1]
                readme_url = f"https://raw.githubusercontent.com/{owner}/{repo}/HEAD/README.md"
                readme = fetch_url_text(readme_url, max_chars=2500)
                if readme:
                    lines.append(f"\nREADME excerpt from {owner}/{repo}:\n{readme[:2500]}")

    if len(lines) <= 2:
        lines.append("- (No GitHub matches — use well-known canonical resources.)")

    return "\n".join(lines)
