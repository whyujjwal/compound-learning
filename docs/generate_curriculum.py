"""Generate docs/curriculum.json from a compact, editable Python definition.

Run:  python docs/generate_curriculum.py

Edit this file (not the JSON) to extend the curriculum. The JSON file is
regenerated and remains the source of truth ingested by the platform.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

OUT = Path(__file__).parent / "curriculum.json"


_CALENDAR_MARKER = re.compile(r"^(Day|Week|Phase)\s+\d+(?:\.\d+)?(?:-\d+(?:\.\d+)?)?$", re.IGNORECASE)


def _clean_label(label: str) -> str:
    """Strip 'Day N', 'Week N', 'Phase N' markers so users see topics, not a calendar.

    Duolingo model: today's work matters, not what day-of-program you're on.
    Internal `sequence` still drives ordering.
    """
    parts = [p.strip() for p in label.split("·")]
    parts = [p for p in parts if p and not _CALENDAR_MARKER.match(p)]
    return " · ".join(parts)


def m(
    title: str,
    url: str,
    block: str,
    *,
    minutes: int = 25,
    priority: int = 50,
    type: str = "practice",
    notes: str = "",
    sequence: int = 0,
    cost: float = 1.0,
) -> dict[str, Any]:
    return {
        "title": title,
        "url": url,
        "block_label": block,
        "type": type,
        "estimated_minutes": minutes,
        "priority_percent": priority,
        "cognitive_cost_multiplier": cost,
        "sequence": sequence,
        "notes": notes,
    }


def _brief(
    watch_mins: int,
    start_ep: int,
    end_ep: int,
    watch_focus: str,
    do_steps: list[str],
    deliverable: list[str],
    recall: list[str],
) -> str:
    n = end_ep - start_ep + 1
    vid_word = "video" if n == 1 else "videos"
    lines = [
        f"WATCH (~{watch_mins} min video)",
        f"• Open playlist at episode {start_ep}. Watch eps {start_ep}-{end_ep} ({n} {vid_word}).",
        f"• {watch_focus}",
        "",
        "DO (during this 2h block)",
    ]
    for i, step in enumerate(do_steps, 1):
        lines.append(f"{i}. {step}")
    lines += ["", "DELIVERABLE (before you rate Good)"]
    for d in deliverable:
        lines.append(f"• {d}")
    lines += ["", "RECALL (after Reveal — no notes)"]
    for r in recall:
        lines.append(f"• {r}")
    return "\n".join(lines)


def _practice_brief(title: str, pattern: str) -> str:
    """Structured session brief for LeetCode / coding practice."""
    pattern = pattern.strip() or "Identify the core invariant before coding."
    return "\n".join([
        "WATCH (~3 min read)",
        f"• Open the problem: {title}",
        "• Read constraints twice. Note input size → required complexity.",
        f"• Pattern: {pattern}",
        "",
        "DO (this block — no solution peeking)",
        "1. Write the approach in plain English (2–3 sentences).",
        "2. State time and space complexity before coding.",
        "3. Code from scratch. Run at least 2 tests including one edge case.",
        "4. If stuck >15 min, read ONE hint only, then retry.",
        "",
        "DELIVERABLE (before you rate Good)",
        "• Accepted submission (green check on LeetCode/GFG)",
        "• One-line pattern tag saved in your notes",
        "",
        "RECALL (after Reveal — no notes)",
        f"• Explain the {title} pattern in 30 seconds.",
        "• Name one problem where this same pattern applies.",
    ])


def _reading_brief(title: str, focus: str) -> str:
    focus = focus.strip() or "Extract the key idea and one example."
    return "\n".join([
        "WATCH (~15 min skim)",
        f"• {title}",
        f"• Focus: {focus}",
        "",
        "DO (this block)",
        "1. Read/skim with a pen — don't passively scroll.",
        "2. Write 3 bullet takeaways in your own words.",
        "3. Connect one idea to something you already know in this track.",
        "",
        "DELIVERABLE",
        "• 3 takeaway bullets in your notes app",
        "",
        "RECALL (after Reveal)",
        f"• Summarize {title} in 60 seconds without notes.",
    ])


def _enrich_material_notes(item: dict[str, Any]) -> None:
    """Upgrade legacy one-line notes to structured WATCH/DO/DELIVERABLE/RECALL briefs."""
    notes = (item.get("notes") or "").strip()
    if notes.startswith("WATCH"):
        return

    title = item["title"]
    url = item.get("url") or ""
    rtype = item.get("type") or "practice"

    if "leetcode.com/problems/" in url or "geeksforgeeks.org" in url or "spoj.com" in url:
        item["notes"] = _practice_brief(title, notes)
    elif rtype in ("reading", "paper") and notes:
        item["notes"] = _reading_brief(title, notes)
    elif rtype == "video" and notes:
        item["notes"] = _reading_brief(title, notes)
    elif rtype == "practice" and notes:
        item["notes"] = _practice_brief(title, notes)


def _session_material(
    creator: str,
    session_num: int,
    topic: str,
    playlist_id: str,
    start_ep: int,
    end_ep: int,
    video_mins: int,
    block: str,
    *,
    watch_focus: str,
    do_steps: list[str] | None = None,
    deliverable: list[str] | None = None,
    recall: list[str] | None = None,
    priority: int = 9,
    type: str = "video",
    cost: float = 1.0,
) -> dict[str, Any]:
    n = end_ep - start_ep + 1
    do = do_steps or [
        "Pause after each video; write one sentence in your own words.",
        "Sketch or table the key idea — don't just highlight the video.",
        "Note one connection to prior material in this track.",
    ]
    deliver = deliverable or [
        f"{n} one-line summary(ies) — one per video",
        "One diagram, table, or formula sheet in your notes app",
    ]
    rec = recall or [
        f"Explain “{topic}” in 60 seconds without notes.",
        "What's the #1 mistake beginners make here?",
    ]
    notes = _brief(video_mins, start_ep, end_ep, watch_focus, do, deliver, rec)
    url = f"https://www.youtube.com/playlist?list={playlist_id}&index={start_ep}"
    title = f"{creator} · Session {session_num}: {topic} (eps {start_ep}-{end_ep})"
    return m(
        title,
        url,
        block,
        minutes=video_mins,
        priority=priority,
        type=type,
        notes=notes,
        cost=cost,
    )


def _sessions_from_rows(
    creator: str,
    playlist_id: str,
    block: str,
    rows: list[tuple[Any, ...]],
    *,
    priority: int = 9,
    type: str = "video",
    cost: float = 1.0,
) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for i, row in enumerate(rows, 1):
        topic, start, end, mins, focus = row[0], row[1], row[2], row[3], row[4]
        kw: dict[str, Any] = {"watch_focus": focus, "priority": priority, "type": type, "cost": cost}
        if len(row) > 5 and row[5]:
            kw["do_steps"] = row[5]
        if len(row) > 6 and row[6]:
            kw["deliverable"] = row[6]
        if len(row) > 7 and row[7]:
            kw["recall"] = row[7]
        items.append(
            _session_material(creator, i, topic, playlist_id, start, end, mins, block, **kw)
        )
    return items


def _statquest_stats_sessions(block: str) -> list[dict[str, Any]]:
    rows = [
        ("Mean, median, mode, histograms", 1, 6, 58, "Central tendency and reading histogram shapes"),
        ("Variance, std dev, MAD, IQR", 7, 12, 55, "Spread measures; when each is appropriate"),
        ("Normal distribution & z-scores", 13, 18, 60, "Bell curve, z-scores, standardization"),
        ("Central limit theorem", 19, 22, 55, "Why sample means look normal; intuition over proof"),
        ("Sampling & standard error", 23, 28, 58, "Samples, SE, why bigger n shrinks uncertainty"),
        ("Confidence intervals", 29, 34, 60, "CI interpretation; common misreadings of intervals"),
        ("Hypothesis testing intro", 35, 40, 58, "Null/alternative, test statistics, rejection regions"),
        ("p-values & significance", 41, 46, 60, "What p-values mean and do NOT mean"),
        ("t-tests & paired tests", 47, 52, 58, "One-sample, two-sample, paired comparisons"),
        ("ANOVA & post-hoc tests", 53, 58, 60, "Comparing 3+ groups; follow-up tests"),
        ("Chi-squared & Fisher's exact", 59, 64, 58, "Categorical association tests"),
        ("Regression basics & correlation", 65, 72, 60, "Linear fit, R², correlation vs causation"),
    ]
    return _sessions_from_rows(
        "StatQuest Stats",
        "PLblh5JKOoLUK0FLuzwntyYI10UQFUhsY9",
        block,
        rows,
    )


def _statquest_ml_sessions(block: str) -> list[dict[str, Any]]:
    rows = [
        ("Bias/variance, train vs test", 1, 5, 55, "Under/overfitting; train-test gap"),
        ("Linear regression", 6, 10, 58, "Least squares, residuals, interpretation"),
        ("Logistic regression", 11, 15, 60, "Sigmoid, odds, classification threshold"),
        ("Decision trees", 16, 20, 58, "Splits, impurity, interpretability"),
        ("Random forest & bagging", 21, 25, 60, "Ensembles, bootstrap, variance reduction"),
        ("Gradient boost & XGBoost", 26, 30, 58, "Sequential error correction; when GB wins"),
        ("SVM & kernels", 31, 35, 60, "Margin, support vectors, kernel trick"),
        ("Neural network basics", 36, 40, 58, "Layers, activations, universal approximation"),
        ("Clustering (k-means, hierarchical)", 41, 45, 55, "Unsupervised grouping; picking k"),
        ("PCA & dimensionality reduction", 46, 50, 60, "Variance preservation; visualization use"),
    ]
    return _sessions_from_rows(
        "StatQuest ML",
        "PLblh5JKOoLUICTaGLRoHQDuF_7q2GfuJF",
        block,
        rows,
    )


def _statquest_nn_sessions(block: str) -> list[dict[str, Any]]:
    rows = [
        ("Forward pass, activations, softmax", 1, 5, 55, "How data flows forward; activation roles"),
        ("Backprop & gradient descent", 6, 10, 58, "Chain rule in networks; weight updates"),
        ("Dropout, batch norm, regularization", 11, 15, 60, "Fighting overfit; training stability"),
        ("Architectures & training tips", 16, 21, 58, "Depth, width, practical training heuristics"),
    ]
    return _sessions_from_rows(
        "StatQuest NN",
        "PLblh5JKOoLUIxGDQs4LFFD--41Vzf-ME1",
        block,
        rows,
    )


def _gaurav_sen_sessions(block: str) -> list[dict[str, Any]]:
    rows = [
        ("Scaling, CAP, sharding basics", 1, 5, 88, "Horizontal scale, CAP tradeoffs, shard keys"),
        ("Caching, CDN, load balancers", 6, 10, 90, "Cache-aside, CDN edge, L4/L7 LB"),
        ("Message queues, pub/sub, Kafka", 11, 15, 92, "Async decoupling, partitions, consumer groups"),
        ("Microservices, SOA, API gateways", 16, 20, 88, "Service boundaries, gateway patterns"),
        ("Distributed coordination", 21, 25, 90, "Leader election, consensus overview"),
        ("Design: Uber, payments, notifications", 26, 30, 92, "Real-time matching, idempotency, fanout"),
        ("Design: Twitter, Netflix, Tinder", 31, 35, 90, "Feed, streaming, geo-matching case studies"),
    ]
    return _sessions_from_rows(
        "Gaurav Sen SD",
        "PLMCXHnjXnTnvo6alSjVkgxV-VH6EPyvoX",
        block,
        rows,
        cost=1.1,
    )


def _jordan_sdi_sessions(block: str) -> list[dict[str, Any]]:
    rows = [
        ("SDI framework & requirements", 1, 3, 88, "Functional/non-functional reqs, scope, constraints"),
        ("Capacity estimation", 4, 6, 90, "QPS, storage, bandwidth back-of-envelope math"),
        ("API design & data modeling", 7, 9, 88, "Entities, relationships, read/write paths"),
        ("Caching deep dive", 10, 12, 90, "Layers, invalidation, stampede, TTL strategy"),
        ("Load balancing & proxies", 13, 15, 88, "Algorithms, sticky sessions, health checks"),
        ("Database sharding & replication", 16, 18, 92, "Shard keys, replicas, read scaling"),
        ("Consistent hashing", 19, 21, 90, "Ring, virtual nodes, minimal remapping"),
        ("Message queues & events", 22, 24, 88, "At-least-once, ordering, dead letter queues"),
        ("Design: URL shortener", 25, 27, 90, "Hash, collision, redirect, analytics"),
        ("Design: Pastebin / file storage", 28, 30, 88, "Object storage, metadata, hot vs cold"),
        ("Design: Twitter / news feed", 31, 33, 92, "Fanout on write vs read, celebrity problem"),
        ("Design: Instagram / photos", 34, 36, 90, "Blob storage, CDN, timeline"),
        ("Design: WhatsApp / messaging", 37, 39, 88, "WebSocket, delivery acks, ordering"),
        ("Design: Uber / ride matching", 40, 42, 90, "Geo-index, supply/demand, surge"),
        ("Design: Yelp / geo search", 43, 45, 88, "Geohash, quadtree, proximity queries"),
        ("Design: Netflix / streaming", 46, 48, 92, "Encoding, CDN, adaptive bitrate"),
        ("Design: Dropbox / sync", 49, 51, 90, "Chunking, dedup, conflict resolution"),
        ("Design: Slack / real-time chat", 52, 54, 88, "Channels, presence, message sync"),
        ("Design: TikTok / feed + rec", 55, 57, 90, "Candidate generation, ranking pipeline"),
        ("Design: Amazon / e-commerce", 58, 60, 88, "Catalog, cart, inventory, checkout"),
        ("Design: Google Docs / collab", 61, 63, 92, "OT/CRDT, versioning, conflict handling"),
        ("Design: Ticketmaster / flash sales", 64, 66, 90, "Queueing, overselling prevention"),
        ("Design: Payment systems", 67, 69, 88, "Idempotency, ledger, reconciliation"),
        ("Design: Rate limiter / API gateway", 70, 72, 90, "Token bucket, sliding window, tiers"),
        ("Design: Web crawler", 73, 75, 88, "Frontier, politeness, dedup, bloom filters"),
        ("Design: Metrics at scale", 76, 78, 90, "Time-series, aggregation, cardinality"),
        ("Design: Search autocomplete", 79, 80, 85, "Trie, ranking, prefix cache"),
        ("Design: Ad click aggregator", 81, 82, 88, "Stream ingest, windowed counts"),
        ("Design: Proximity / nearby", 83, 84, 90, "Geo shards, query fanout"),
        ("Design: Distributed cache capstone", 85, 86, 88, "Eviction, consistency, hot keys"),
    ]
    return _sessions_from_rows(
        "Jordan SDI",
        "PLjTveVh7FakLdTmm42TMxbN8PvVn5g4KJ",
        block,
        rows,
        cost=1.1,
    )


def _mit_6824_sessions(block: str) -> list[dict[str, Any]]:
    rows = [
        ("L1: Intro & MapReduce", 1, 1, 80, "Why distributed systems; MapReduce paper walkthrough"),
        ("L2: RPC & threads", 2, 2, 80, "Go concurrency primitives; RPC failure modes"),
        ("L3: GFS", 3, 3, 80, "Master/chunkservers; single-master tradeoffs"),
        ("L4: Primary-backup replication", 4, 4, 80, "Replication state machine basics"),
        ("L5: Go threads deep dive", 5, 5, 80, "Channels, goroutines, RPC patterns"),
        ("L6: Raft basics", 6, 6, 80, "Leader election; safety intuition"),
        ("L7: Raft log replication", 7, 7, 80, "Log matching; commit rules"),
        ("L8: ZooKeeper", 8, 8, 80, "Coordination primitives; linearizability"),
        ("L9: Chain replication / CRAQ", 9, 9, 80, "Chain vs primary-backup; read-your-writes"),
        ("L10: Aurora & cloud DBs", 10, 10, 80, "Log-structured storage at cloud scale"),
        ("L11: Memcached at Facebook", 11, 11, 80, "Cache consistency in the wild"),
        ("L12: Distributed transactions", 12, 12, 80, "2PC, OCC, snapshot isolation"),
        ("L13: Spanner", 13, 13, 80, "TrueTime; global strong consistency"),
        ("L14: FaRM & RDMA", 14, 14, 80, "Fast transactions over RDMA"),
        ("L15: Dynamo & consistent hashing", 15, 15, 80, "AP design; vector clocks; rings"),
        ("L16: Eventual consistency & CRDTs", 16, 16, 80, "Conflict-free replicated data types"),
        ("L17: COPS causal consistency", 17, 17, 80, "Causal+ sessions; geo replication"),
        ("L18: Bitcoin consensus", 18, 18, 80, "Proof-of-work; eventual consensus"),
        ("L19: Frangipani", 19, 19, 80, "Distributed file system layering"),
        ("L20: Course wrap-up", 20, 20, 80, "Themes recap; exam-style synthesis"),
        ("L21: Guest lecture", 21, 21, 80, "Bonus topic — take structured notes"),
        ("L22: Guest lecture", 22, 22, 80, "Bonus topic — take structured notes"),
    ]
    return _sessions_from_rows(
        "MIT 6.824",
        "PLrw6a1wE39_tb2fErI4-WkMbsvGQk9_UB",
        block,
        rows,
        type="course",
        cost=1.5,
        priority=10,
    )


# ============================================================================
# DSA — Striver A2Z, top ~140 milestone problems with patterns
# ============================================================================

DSA_TRACK = {
    "slug": "dsa",
    "name": "Data Structures & Algorithms",
    "description": "Striver A2Z (TUF) — 18 steps from syntax to advanced strings. Mastery via patterns + spaced re-solving.",
    "color": "#22c55e",
    "cognitive_multiplier": 1.2,
    "is_system": False,
    "materials": [],
}


def add_dsa():
    """Striver A2Z — full 450 problem sheet. Topical blocks (no calendar markers).
    Sustainable for years; reschedule walks blocks at your pace.
    """
    items: list[dict[str, Any]] = []

    def lc(slug: str) -> str:
        return f"https://leetcode.com/problems/{slug}/"

    def gfg(slug: str) -> str:
        return f"https://www.geeksforgeeks.org/{slug}/"

    def tuf(slug: str) -> str:
        return f"https://takeuforward.org/{slug}"

    SHEET = "https://takeuforward.org/strivers-a2z-dsa-course/strivers-a2z-dsa-course-sheet-2"

    # ═══ Step 1: Basics — language, math, recursion, hashing (29) ═══
    B = "DSA · Basics"
    items += [
        m("Striver A2Z sheet — official syllabus", SHEET, B, minutes=20, priority=2, type="reading", notes="Bookmark. Single source of truth for the 450."),
        m("User I/O in your language", "https://www.youtube.com/watch?v=8jLOx1hD3_o", B, minutes=20, priority=85, type="video", notes="Optional if you already code daily. Pick ONE language. Speed-read syntax only."),
        m("Data types & operators", "https://www.youtube.com/watch?v=8jLOx1hD3_o", B, minutes=20, priority=85, type="video", notes="Optional. int/long ranges, overflow gotchas."),
        m("If/else & switch", "https://www.youtube.com/watch?v=8jLOx1hD3_o", B, minutes=15, priority=85, type="video", notes="Optional syntax refresh."),
        m("Arrays & strings primer", "https://www.youtube.com/watch?v=8jLOx1hD3_o", B, minutes=20, priority=85, type="video", notes="Optional. Skip if comfortable with arrays."),
        m("For/while loops", "https://www.youtube.com/watch?v=8jLOx1hD3_o", B, minutes=15, priority=85, type="video", notes="Optional syntax refresh."),
        m("Functions & pass-by-value/reference", "https://www.youtube.com/watch?v=8jLOx1hD3_o", B, minutes=20, priority=85, type="video", notes="Optional. Know pass-by-value vs reference for your language."),
        m("Time & space complexity primer", "https://www.youtube.com/watch?v=FPu9Uld7W-E", B, minutes=45, priority=6, type="video", notes="Big-O/Theta/Omega. Recognize O(1), O(log n), O(n), O(n log n), O(n²), O(2^n)."),
        m("Star patterns (15+ classics)", gfg("printing-pattern-using-loops"), B, minutes=60, priority=5, notes="Pyramids, half-pyramids, hollow, diamond. Build loop intuition."),
        m("C++ STL or Java Collections", "https://www.youtube.com/watch?v=RRVWBrofHFs", B, minutes=120, priority=8, type="video", cost=1.2, notes="vector/list, pair, map/set, queue/stack, priority_queue, sort/lower_bound. Memorize."),
        m("Count digits in integer", gfg("program-count-digits-integer-3-different-methods"), B, minutes=15, priority=4),
        m("Reverse a number", lc("reverse-integer"), B, minutes=20, priority=6, notes="Watch INT_MAX/MIN overflow."),
        m("Check palindrome number", lc("palindrome-number"), B, minutes=20, priority=6),
        m("GCD/HCF", gfg("euclidean-algorithms-basic-and-extended"), B, minutes=20, priority=7, notes="gcd(a,b) = gcd(b, a%b). Base: b==0."),
        m("Armstrong numbers", gfg("armstrong-numbers"), B, minutes=15, priority=3),
        m("Print all divisors", gfg("find-divisors-natural-number-set-1"), B, minutes=15, priority=5, notes="Loop i to √n. Add i and n/i."),
        m("Check prime", gfg("check-whether-a-given-number-is-prime-or-not"), B, minutes=15, priority=5, notes="Loop to √n."),
        m("Recursion intro — print 1..N", gfg("print-1-to-n-using-recursion"), B, minutes=20, priority=7, notes="Base case, recursive call. Stack memory."),
        m("Print name N times via recursion", gfg("print-name-n-times-recursion"), B, minutes=15, priority=4),
        m("Print N..1 via recursion", gfg("print-numbers-1-n-recursion"), B, minutes=15, priority=4),
        m("Sum of first N numbers (recursion)", gfg("program-find-sum-first-n-natural-numbers"), B, minutes=20, priority=5),
        m("Factorial of N (recursion)", lc("factorial-trailing-zeroes"), B, minutes=20, priority=6),
        m("Reverse array (recursion)", gfg("write-a-program-to-reverse-an-array-or-string"), B, minutes=20, priority=6),
        m("Check string palindrome (recursion)", lc("valid-palindrome"), B, minutes=20, priority=6),
        m("Fibonacci (recursion + memo)", lc("fibonacci-number"), B, minutes=25, priority=7, notes="Naive O(2^n). Memo O(n)."),
        m("Frequency of array elements (hashing)", gfg("frequency-elements-array"), B, minutes=20, priority=6, notes="unordered_map / dict. Foundation for many problems."),
        m("Highest/lowest frequency element", gfg("frequency-of-the-elements-in-an-array-of-real-numbers"), B, minutes=20, priority=6),
        m("Number hashing — array as map", gfg("write-a-program-to-find-the-element-that-occurs-the-maximum-number-of-times"), B, minutes=25, priority=6),
        m("Character hashing (26 / 256 array)", gfg("counting-frequencies-of-array-elements"), B, minutes=20, priority=6),
    ]

    # ═══ Step 2: Sorting (7) ═══
    SO = "DSA · Sorting"
    items += [
        m("Selection sort", gfg("selection-sort"), SO, minutes=20, priority=5, notes="Pick min from unsorted half. O(n²)."),
        m("Bubble sort", gfg("bubble-sort"), SO, minutes=20, priority=4, notes="Swap adjacent. O(n²). Early exit if sorted pass."),
        m("Insertion sort", gfg("insertion-sort"), SO, minutes=20, priority=6, notes="Insert nums[i] into sorted prefix. Best O(n) for nearly sorted."),
        m("Merge sort", gfg("merge-sort"), SO, minutes=40, priority=9, notes="Divide+conquer. Stable. O(n log n) always. O(n) aux."),
        m("Recursive bubble sort", gfg("recursive-bubble-sort"), SO, minutes=20, priority=3),
        m("Recursive insertion sort", gfg("recursive-insertion-sort"), SO, minutes=20, priority=3),
        m("Quick sort", gfg("quick-sort"), SO, minutes=40, priority=9, notes="Partition. Avg O(n log n). Worst O(n²) on sorted unless random pivot."),
        m("Sort an array (implement)", lc("sort-an-array"), SO, minutes=30, priority=7, notes="Implement merge sort end-to-end."),
    ]

    # ═══ Step 3.1: Arrays Easy (14) ═══
    AE = "DSA · Arrays I (easy)"
    items += [
        m("Largest element in array", gfg("c-program-to-find-largest-element-in-an-array"), AE, minutes=10, priority=4),
        m("Second largest (no sort)", gfg("find-second-largest-element-array"), AE, minutes=15, priority=6, notes="Single pass: track largest + second."),
        m("Check if array sorted", lc("check-if-array-is-sorted-and-rotated"), AE, minutes=20, priority=5),
        m("Remove duplicates from sorted array", lc("remove-duplicates-from-sorted-array"), AE, minutes=20, priority=7, notes="Two pointer (slow/fast). In-place."),
        m("Left rotate array by 1", gfg("c-program-to-cyclically-rotate-an-array-by-one"), AE, minutes=10, priority=4),
        m("Left rotate by D places", lc("rotate-array"), AE, minutes=25, priority=7, notes="Reverse trick. k %= n first."),
        m("Move zeros to end", lc("move-zeroes"), AE, minutes=20, priority=7),
        m("Linear search", gfg("linear-search"), AE, minutes=5, priority=2),
        m("Union of two sorted arrays", gfg("union-of-two-arrays"), AE, minutes=20, priority=6, notes="Two pointer merge, skip dupes."),
        m("Intersection of two sorted arrays", gfg("intersection-of-two-sorted-arrays-2"), AE, minutes=20, priority=6),
        m("Missing number 0..n", lc("missing-number"), AE, minutes=20, priority=7, notes="XOR or sum trick."),
        m("Max consecutive ones", lc("max-consecutive-ones"), AE, minutes=15, priority=5),
        m("Single number (others twice)", lc("single-number"), AE, minutes=15, priority=7, notes="XOR all."),
        m("Longest subarray sum K (positives)", gfg("longest-sub-array-sum-k"), AE, minutes=30, priority=7, notes="Sliding window if all positive."),
        m("Longest subarray sum K (any sign)", gfg("longest-subarray-with-sum-k"), AE, minutes=35, priority=7, notes="Prefix sum + hashmap."),
    ]

    # ═══ Step 3.2: Arrays Medium (14) ═══
    AM = "DSA · Arrays II (medium)"
    items += [
        m("Two sum", lc("two-sum"), AM, minutes=25, priority=9, notes="Hash map. Single pass."),
        m("Sort colors (0/1/2)", lc("sort-colors"), AM, minutes=30, priority=8, notes="Dutch national flag: low/mid/high."),
        m("Majority element (>n/2)", lc("majority-element"), AM, minutes=25, priority=8, notes="Boyer-Moore voting."),
        m("Kadane — max subarray sum", lc("maximum-subarray"), AM, minutes=30, priority=10, notes="Foundational. Reset on negative running sum."),
        m("Print Kadane's subarray", gfg("largest-sum-contiguous-subarray"), AM, minutes=20, priority=6, notes="Track start/end indices."),
        m("Best time to buy & sell stock I", lc("best-time-to-buy-and-sell-stock"), AM, minutes=25, priority=9, notes="Track min so far, max profit."),
        m("Rearrange by sign", lc("rearrange-array-elements-by-sign"), AM, minutes=25, priority=6),
        m("Next permutation", lc("next-permutation"), AM, minutes=40, priority=10, notes="Classic 4-step. Memorize."),
        m("Leaders in array", gfg("leaders-in-an-array"), AM, minutes=20, priority=6, notes="Right-to-left scan, track max so far."),
        m("Longest consecutive sequence", lc("longest-consecutive-sequence"), AM, minutes=35, priority=9, notes="Hash set. Only start counting from sequence heads."),
        m("Set matrix zeros", lc("set-matrix-zeroes"), AM, minutes=35, priority=8, notes="In-place: use first row/col as markers."),
        m("Rotate matrix 90°", lc("rotate-image"), AM, minutes=30, priority=8, notes="Transpose then reverse rows."),
        m("Spiral matrix", lc("spiral-matrix"), AM, minutes=30, priority=8, notes="Four bounds, shrink each pass."),
        m("Count subarrays sum K", lc("subarray-sum-equals-k"), AM, minutes=35, priority=10, notes="Prefix sum + hash map. Foundational pattern."),
    ]

    # ═══ Step 3.3: Arrays Hard (15) ═══
    AH = "DSA · Arrays III (hard)"
    items += [
        m("Pascal's triangle", lc("pascals-triangle"), AH, minutes=30, priority=7, notes="C(n,r) recursion or direct formula."),
        m("Pascal's triangle II (single row)", lc("pascals-triangle-ii"), AH, minutes=25, priority=6),
        m("Majority element (>n/3)", lc("majority-element-ii"), AH, minutes=35, priority=8, notes="Extended Boyer-Moore: at most 2 candidates."),
        m("3 sum", lc("3sum"), AH, minutes=40, priority=10, notes="Sort + two pointer. Skip dupes carefully."),
        m("4 sum", lc("4sum"), AH, minutes=45, priority=8, notes="Sort + double loop + two pointer. Overflow careful."),
        m("Largest subarray with zero sum", gfg("find-the-largest-subarray-with-0-sum"), AH, minutes=30, priority=8, notes="Prefix sum hash map."),
        m("Count subarrays with XOR K", gfg("count-number-of-subarrays-with-given-xor"), AH, minutes=35, priority=8, notes="Prefix XOR map. count(prefix^K)."),
        m("Merge overlapping intervals", lc("merge-intervals"), AH, minutes=30, priority=9),
        m("Merge two sorted arrays in-place", lc("merge-sorted-array"), AH, minutes=30, priority=7, notes="Fill from end. Three pointers."),
        m("Repeating + missing number", gfg("find-a-repeating-and-a-missing-number"), AH, minutes=40, priority=7, notes="Math eqs (sum, sum²) or XOR partition."),
        m("Find duplicate (n+1 array)", lc("find-the-duplicate-number"), AH, minutes=35, priority=8, notes="Floyd cycle (array-as-LL). O(n)/O(1)."),
        m("Max product subarray", lc("maximum-product-subarray"), AH, minutes=35, priority=8, notes="Track min+max ending at i."),
        m("Count inversions", gfg("counting-inversions"), AH, minutes=45, priority=8, cost=1.2, notes="Modified merge sort. Count when L[i]>R[j] in merge."),
        m("Reverse pairs", lc("reverse-pairs"), AH, minutes=50, priority=7, cost=1.3, notes="Like count inversions but condition L[i]>2*R[j]. Two-pointer in merge."),
    ]

    # ═══ Step 4.1: Binary Search 1D (13) ═══
    BS1 = "DSA · Binary search (1D)"
    items += [
        m("Binary search template", lc("binary-search"), BS1, minutes=25, priority=10, notes="Master both inclusive and exclusive variants."),
        m("Implement lower bound", gfg("lower-bound"), BS1, minutes=25, priority=9),
        m("Implement upper bound", gfg("upper-bound"), BS1, minutes=20, priority=9),
        m("Search insert position", lc("search-insert-position"), BS1, minutes=20, priority=7),
        m("Floor/ceil in sorted array", gfg("ceiling-in-a-sorted-array"), BS1, minutes=25, priority=7),
        m("First/last occurrence", lc("find-first-and-last-position-of-element-in-sorted-array"), BS1, minutes=30, priority=8),
        m("Count occurrences in sorted array", gfg("count-number-of-occurrences-or-frequency-in-a-sorted-array"), BS1, minutes=20, priority=6, notes="UB - LB."),
        m("Search in rotated sorted array I", lc("search-in-rotated-sorted-array"), BS1, minutes=35, priority=10, notes="One half always sorted."),
        m("Search in rotated sorted array II (dupes)", lc("search-in-rotated-sorted-array-ii"), BS1, minutes=35, priority=8),
        m("Find min in rotated sorted array", lc("find-minimum-in-rotated-sorted-array"), BS1, minutes=30, priority=9),
        m("Times array has been rotated", gfg("find-rotation-count-rotated-sorted-array"), BS1, minutes=25, priority=6, notes="Index of min element."),
        m("Single element in sorted array", lc("single-element-in-a-sorted-array"), BS1, minutes=30, priority=8, notes="Pairs at even index. Single breaks pattern."),
        m("Find peak element", lc("find-peak-element"), BS1, minutes=30, priority=8),
    ]

    # ═══ Step 4.2: Binary Search on Answers (15) ═══
    BS2 = "DSA · Binary search on answers"
    items += [
        m("Integer sqrt(x)", lc("sqrtx"), BS2, minutes=20, priority=7),
        m("Nth root of M", gfg("find-nth-root-of-m"), BS2, minutes=30, priority=6),
        m("Koko eating bananas", lc("koko-eating-bananas"), BS2, minutes=35, priority=9, notes="BS on speed."),
        m("Minimum days to make M bouquets", lc("minimum-number-of-days-to-make-m-bouquets"), BS2, minutes=35, priority=8),
        m("Find the smallest divisor", lc("find-the-smallest-divisor-given-a-threshold"), BS2, minutes=30, priority=7),
        m("Capacity to ship in D days", lc("capacity-to-ship-packages-within-d-days"), BS2, minutes=35, priority=9, notes="BS on capacity."),
        m("Kth missing positive number", lc("kth-missing-positive-number"), BS2, minutes=30, priority=7),
        m("Aggressive cows", "https://www.spoj.com/problems/AGGRCOW/", BS2, minutes=40, priority=8, notes="BS on min distance."),
        m("Book allocation problem", gfg("allocate-minimum-number-pages"), BS2, minutes=40, priority=8),
        m("Split array — largest sum", lc("split-array-largest-sum"), BS2, minutes=40, priority=8, notes="BS on max sum allowed."),
        m("Painter's partition", gfg("painters-partition-problem"), BS2, minutes=40, priority=7),
        m("Minimize max distance to gas station", gfg("place-k-elements-such-that-minimum-distance-is-maximized"), BS2, minutes=45, priority=6),
        m("Median of two sorted arrays", lc("median-of-two-sorted-arrays"), BS2, minutes=60, priority=10, cost=1.3, notes="Hard. BS on smaller array's partition."),
        m("Kth element of two sorted arrays", gfg("k-th-element-two-sorted-arrays"), BS2, minutes=45, priority=7),
    ]

    # ═══ Step 4.3: Binary Search 2D (5) ═══
    BS3 = "DSA · Binary search (2D)"
    items += [
        m("Row with max 1s", gfg("find-the-row-with-maximum-number-1s"), BS3, minutes=25, priority=6),
        m("Search in 2D matrix I", lc("search-a-2d-matrix"), BS3, minutes=30, priority=8, notes="Treat as flat sorted. BS on m*n."),
        m("Search in 2D matrix II (row/col sorted)", lc("search-a-2d-matrix-ii"), BS3, minutes=30, priority=8, notes="Start top-right or bot-left. O(m+n)."),
        m("Peak element in 2D matrix", lc("find-a-peak-element-ii"), BS3, minutes=45, priority=7, cost=1.2, notes="BS on columns."),
        m("Matrix median", gfg("median-row-wise-sorted-matrix"), BS3, minutes=45, priority=6),
    ]

    # ═══ Step 5.1: Strings Easy (6) ═══
    SE = "DSA · Strings I (easy)"
    items += [
        m("Remove outermost parentheses", lc("remove-outermost-parentheses"), SE, minutes=20, priority=5),
        m("Reverse words in string", lc("reverse-words-in-a-string"), SE, minutes=25, priority=7),
        m("Largest odd number in string", lc("largest-odd-number-in-string"), SE, minutes=15, priority=4),
        m("Longest common prefix", lc("longest-common-prefix"), SE, minutes=20, priority=6),
        m("Isomorphic strings", lc("isomorphic-strings"), SE, minutes=25, priority=6),
        m("String rotation check", gfg("a-program-to-check-if-strings-are-rotations-of-each-other"), SE, minutes=15, priority=5, notes="(s1+s1).contains(s2)."),
    ]

    # ═══ Step 5.2: Strings Medium (10) ═══
    SM = "DSA · Strings I (medium)"
    items += [
        m("Sort characters by frequency", lc("sort-characters-by-frequency"), SM, minutes=25, priority=6),
        m("Max depth of parentheses", lc("maximum-nesting-depth-of-the-parentheses"), SM, minutes=20, priority=5),
        m("Roman to integer", lc("roman-to-integer"), SM, minutes=25, priority=6),
        m("Integer to Roman", lc("integer-to-roman"), SM, minutes=30, priority=5),
        m("Implement atoi", lc("string-to-integer-atoi"), SM, minutes=40, priority=8, notes="Many edge cases. Whitespace, sign, overflow."),
        m("Count substrings", gfg("count-distinct-substrings-string-using-suffix-trie"), SM, minutes=35, priority=5),
        m("Longest palindromic substring", lc("longest-palindromic-substring"), SM, minutes=40, priority=8, notes="Expand around center."),
        m("Sum of beauty of substrings", lc("sum-of-beauty-of-all-substrings"), SM, minutes=35, priority=5),
        m("Reverse every word", lc("reverse-words-in-a-string-iii"), SM, minutes=20, priority=5),
        m("Valid anagram", lc("valid-anagram"), SM, minutes=15, priority=7),
        m("Group anagrams", lc("group-anagrams"), SM, minutes=25, priority=8),
    ]

    # ═══ Step 6.1: Singly Linked List basics (5) ═══
    LL1 = "DSA · Linked list (basics)"
    items += [
        m("Intro to LL — struct/representation", gfg("data-structures-linked-list"), LL1, minutes=30, priority=6, type="reading"),
        m("Insert node in LL (head/tail/pos)", gfg("write-a-function-to-insert-a-node-in-linked-list"), LL1, minutes=30, priority=6),
        m("Delete node in LL", gfg("write-a-function-to-delete-a-linked-list"), LL1, minutes=30, priority=6),
        m("Length of LL", gfg("find-length-of-a-linked-list-iterative-and-recursive"), LL1, minutes=15, priority=5),
        m("Search element in LL", gfg("write-a-function-that-counts-the-number-of-times-a-given-int-occurs-in-a-linked-list"), LL1, minutes=15, priority=5),
    ]

    # ═══ Step 6.2: Doubly Linked List (4) ═══
    DLL = "DSA · Doubly linked list"
    items += [
        m("Intro to DLL", gfg("doubly-linked-list"), DLL, minutes=25, priority=5, type="reading"),
        m("Insert node in DLL", gfg("doubly-linked-list-introduction-and-insertion"), DLL, minutes=25, priority=5),
        m("Delete node in DLL", gfg("delete-a-node-in-a-doubly-linked-list"), DLL, minutes=25, priority=5),
        m("Reverse a DLL", gfg("reverse-a-doubly-linked-list"), DLL, minutes=30, priority=7),
        m("Delete all occurrences of key (DLL)", gfg("delete-occurrences-of-an-element-if-found-in-doubly-linked-list"), DLL, minutes=30, priority=6),
        m("Pairs with sum K in sorted DLL", gfg("find-pairs-given-sum-doubly-linked-list"), DLL, minutes=30, priority=6),
        m("Remove duplicates from sorted DLL", gfg("remove-duplicates-from-an-unsorted-doubly-linked-list"), DLL, minutes=25, priority=5),
    ]

    # ═══ Step 6.3: LL Medium (15) ═══
    LL2 = "DSA · Linked list (medium)"
    items += [
        m("Middle of LL (tortoise/hare)", lc("middle-of-the-linked-list"), LL2, minutes=20, priority=9),
        m("Reverse LL (iterative)", lc("reverse-linked-list"), LL2, minutes=25, priority=10, notes="prev/cur/next dance. Memorize."),
        m("Reverse LL (recursive)", lc("reverse-linked-list"), LL2, minutes=25, priority=7),
        m("Detect loop in LL", lc("linked-list-cycle"), LL2, minutes=25, priority=10),
        m("Find start of loop in LL", lc("linked-list-cycle-ii"), LL2, minutes=35, priority=9),
        m("Length of loop in LL", gfg("find-length-of-loop-in-linked-list"), LL2, minutes=25, priority=6),
        m("Palindrome LL", lc("palindrome-linked-list"), LL2, minutes=30, priority=8, notes="Reverse second half."),
        m("Segregate odd/even nodes in LL", lc("odd-even-linked-list"), LL2, minutes=25, priority=7),
        m("Remove Nth from end", lc("remove-nth-node-from-end-of-list"), LL2, minutes=30, priority=8, notes="Dummy + two pointer gap n+1."),
        m("Delete middle of LL", lc("delete-the-middle-node-of-a-linked-list"), LL2, minutes=25, priority=7),
        m("Sort LL (merge sort)", lc("sort-list"), LL2, minutes=40, priority=8, cost=1.2),
        m("Sort LL of 0s/1s/2s (links only)", gfg("sort-linked-list-0s-1s-2s-changing-links"), LL2, minutes=30, priority=6),
        m("Intersection of two LLs", lc("intersection-of-two-linked-lists"), LL2, minutes=30, priority=8, notes="Pointer swap trick."),
        m("Add 1 to number in LL", gfg("add-1-number-represented-linked-list"), LL2, minutes=30, priority=6),
        m("Add two numbers in LL", lc("add-two-numbers"), LL2, minutes=30, priority=8),
    ]

    # ═══ Step 6.4: LL Hard (5) ═══
    LL3 = "DSA · Linked list (hard)"
    items += [
        m("Reverse LL in groups of K", lc("reverse-nodes-in-k-group"), LL3, minutes=45, priority=9, cost=1.2, notes="Brutal pointer surgery."),
        m("Rotate a LL", lc("rotate-list"), LL3, minutes=30, priority=7),
        m("Flatten a LL", gfg("flattening-a-linked-list"), LL3, minutes=40, priority=7),
        m("Copy LL with random pointer", lc("copy-list-with-random-pointer"), LL3, minutes=40, priority=9, notes="Interleave or hashmap."),
        m("Merge K sorted lists", lc("merge-k-sorted-lists"), LL3, minutes=40, priority=9),
    ]

    # ═══ Step 7.1: Recursion (Hold) (5) ═══
    R1 = "DSA · Recursion (foundations)"
    items += [
        m("Recursive atoi", lc("string-to-integer-atoi"), R1, minutes=30, priority=6),
        m("Pow(x, n)", lc("powx-n"), R1, minutes=30, priority=9, notes="Fast exp. Halve recursively. O(log n)."),
        m("Count good numbers", lc("count-good-numbers"), R1, minutes=35, priority=6),
        m("Sort stack using recursion", gfg("sort-a-stack-using-recursion"), R1, minutes=30, priority=6),
        m("Reverse stack using recursion", gfg("reverse-a-stack-using-recursion"), R1, minutes=30, priority=6),
    ]

    # ═══ Step 7.2: Recursion (Subsequences) (10) ═══
    R2 = "DSA · Recursion (subsequences)"
    items += [
        m("Generate all binary strings", lc("binary-strings-without-consecutive-ones"), R2, minutes=30, priority=6),
        m("Generate parentheses", lc("generate-parentheses"), R2, minutes=30, priority=8),
        m("Print all subsequences / power set", lc("subsets"), R2, minutes=30, priority=9, notes="Pick/not-pick. O(2^n)."),
        m("Subsequences pattern (theory)", gfg("printing-all-subsequences-arrayslist-using-recursion"), R2, minutes=30, priority=7, type="reading"),
        m("Count all subsequences with sum K", gfg("count-all-subsequences-with-sum-k"), R2, minutes=35, priority=7),
        m("Check if subseq with sum K exists", gfg("subset-sum-problem"), R2, minutes=30, priority=7),
        m("Combination sum", lc("combination-sum"), R2, minutes=40, priority=9),
        m("Combination sum II (dupes)", lc("combination-sum-ii"), R2, minutes=40, priority=8),
        m("Subset sum I (all subset sums)", gfg("subset-sum-divide-the-array"), R2, minutes=30, priority=6),
        m("Subsets II (with dupes)", lc("subsets-ii"), R2, minutes=30, priority=8),
        m("Combination sum III", lc("combination-sum-iii"), R2, minutes=30, priority=7),
        m("Letter combos of phone number", lc("letter-combinations-of-a-phone-number"), R2, minutes=30, priority=8),
    ]

    # ═══ Step 7.3: Recursion (Hard / Backtracking) (8) ═══
    R3 = "DSA · Recursion (backtracking)"
    items += [
        m("Palindrome partitioning", lc("palindrome-partitioning"), R3, minutes=40, priority=8),
        m("Word search", lc("word-search"), R3, minutes=40, priority=8),
        m("N-Queens", lc("n-queens"), R3, minutes=50, priority=9, cost=1.2, notes="Track cols/diag1/diag2."),
        m("Rat in a maze", gfg("rat-in-a-maze-backtracking-2"), R3, minutes=40, priority=7),
        m("Word break", lc("word-break"), R3, minutes=35, priority=8, notes="DP also works."),
        m("M coloring problem", gfg("m-coloring-problem"), R3, minutes=40, priority=6),
        m("Sudoku solver", lc("sudoku-solver"), R3, minutes=60, priority=8, cost=1.3, notes="Backtracking on each empty cell."),
        m("Expression add operators", lc("expression-add-operators"), R3, minutes=50, priority=6),
    ]

    # ═══ Step 8.1: Bit Manipulation basics (8) ═══
    BIT1 = "DSA · Bit manipulation (basics)"
    items += [
        m("Bit manipulation intro (theory)", gfg("bits-manipulation-important-tactics"), BIT1, minutes=30, priority=8, type="reading", notes="set/clear/toggle/check. n&(n-1) trick."),
        m("Check i-th bit set", gfg("check-whether-k-th-bit-set-not"), BIT1, minutes=15, priority=5),
        m("Check odd/even with bits", gfg("check-whether-a-given-number-is-even-or-odd"), BIT1, minutes=10, priority=4),
        m("Power of 2 check", lc("power-of-two"), BIT1, minutes=10, priority=5, notes="n & (n-1) == 0."),
        m("Count set bits", lc("number-of-1-bits"), BIT1, minutes=15, priority=7, notes="Brian Kernighan."),
        m("Set/unset rightmost unset bit", gfg("set-rightmost-unset-bit"), BIT1, minutes=20, priority=5),
        m("Swap two numbers (XOR)", gfg("swap-two-numbers-without-using-temporary-variable"), BIT1, minutes=15, priority=4),
        m("Divide without using /", lc("divide-two-integers"), BIT1, minutes=40, priority=7, notes="Bit-shift subtraction."),
    ]

    # ═══ Step 8.2: Bit Manipulation interview (7) ═══
    BIT2 = "DSA · Bit manipulation (advanced)"
    items += [
        m("Count bits to flip A→B", gfg("count-number-of-bits-to-be-flipped-to-convert-a-to-b"), BIT2, minutes=20, priority=6, notes="popcount(a^b)."),
        m("Number appearing odd times", gfg("find-the-number-occurring-odd-number-of-times"), BIT2, minutes=15, priority=6),
        m("Power set via bits", lc("subsets"), BIT2, minutes=25, priority=7, notes="i from 0 to 2^n-1, bit j of i = include nums[j]."),
        m("XOR of L..R", gfg("find-xor-of-numbers-from-l-to-r"), BIT2, minutes=25, priority=6, notes="XOR(0..n) follows period-4 pattern."),
        m("Two numbers appearing odd times", lc("single-number-iii"), BIT2, minutes=35, priority=7),
        m("Single number II (one appears once, rest 3×)", lc("single-number-ii"), BIT2, minutes=35, priority=7),
        m("Reverse bits", lc("reverse-bits"), BIT2, minutes=25, priority=6),
    ]

    # ═══ Step 8.3: Math + Bits (5) ═══
    MATHB = "DSA · Math (primes & power)"
    items += [
        m("Print prime factors", gfg("print-all-prime-factors-of-a-given-number"), MATHB, minutes=20, priority=6),
        m("All divisors", gfg("find-all-divisors-of-a-natural-number-set-1"), MATHB, minutes=15, priority=5),
        m("Sieve of Eratosthenes", lc("count-primes"), MATHB, minutes=30, priority=8, notes="O(n log log n). Memorize."),
        m("Prime factorization with sieve", gfg("smallest-prime-factorizing-number"), MATHB, minutes=30, priority=6),
        m("Pow(x, n) fast", lc("powx-n"), MATHB, minutes=25, priority=7),
    ]

    # ═══ Step 9.1: Stack/Queue basics (8) ═══
    SQ1 = "DSA · Stack & Queue (basics)"
    items += [
        m("Implement stack using arrays", gfg("stack-data-structure-introduction-program"), SQ1, minutes=25, priority=6),
        m("Implement queue using arrays", gfg("array-implementation-of-queue-simple"), SQ1, minutes=25, priority=6),
        m("Stack using queues", lc("implement-stack-using-queues"), SQ1, minutes=30, priority=6),
        m("Queue using stacks", lc("implement-queue-using-stacks"), SQ1, minutes=30, priority=6, notes="Two stacks. Amortized O(1)."),
        m("Stack using linked list", gfg("implement-a-stack-using-singly-linked-list"), SQ1, minutes=25, priority=5),
        m("Queue using linked list", gfg("queue-linked-list-implementation"), SQ1, minutes=25, priority=5),
        m("Check balanced parentheses", lc("valid-parentheses"), SQ1, minutes=20, priority=9),
        m("Min stack", lc("min-stack"), SQ1, minutes=30, priority=8),
    ]

    # ═══ Step 9.2: Prefix/Infix/Postfix conversions (6) ═══
    PXFIX = "DSA · Stack (expression conversions)"
    items += [
        m("Infix → Postfix", gfg("stack-set-2-infix-to-postfix"), PXFIX, minutes=35, priority=7),
        m("Prefix → Infix", gfg("prefix-infix-conversion"), PXFIX, minutes=25, priority=5),
        m("Prefix → Postfix", gfg("prefix-postfix-conversion"), PXFIX, minutes=25, priority=5),
        m("Postfix → Prefix", gfg("postfix-prefix-conversion"), PXFIX, minutes=25, priority=5),
        m("Postfix → Infix", gfg("postfix-to-infix"), PXFIX, minutes=25, priority=5),
        m("Infix → Prefix", gfg("convert-infix-prefix-notation"), PXFIX, minutes=30, priority=5),
    ]

    # ═══ Step 9.3: Monotonic Stack/Queue (10) ═══
    MONO = "DSA · Stack & Queue (monotonic)"
    items += [
        m("Next greater element I", lc("next-greater-element-i"), MONO, minutes=30, priority=10, notes="The pattern. Memorize."),
        m("Next greater element II (circular)", lc("next-greater-element-ii"), MONO, minutes=30, priority=9),
        m("Next smaller element", gfg("next-smaller-element"), MONO, minutes=30, priority=8),
        m("Count NGEs to right", gfg("number-of-nges-to-the-right"), MONO, minutes=30, priority=6),
        m("Trapping rainwater", lc("trapping-rain-water"), MONO, minutes=40, priority=10, cost=1.2, notes="Two pointer OR monotonic stack. Both worth knowing."),
        m("Sum of subarray minimums", lc("sum-of-subarray-minimums"), MONO, minutes=40, priority=8, cost=1.2),
        m("Asteroid collision", lc("asteroid-collision"), MONO, minutes=35, priority=8),
        m("Sum of subarray ranges", lc("sum-of-subarray-ranges"), MONO, minutes=40, priority=7),
        m("Remove K digits", lc("remove-k-digits"), MONO, minutes=35, priority=7, notes="Monotonic increasing stack."),
        m("Largest rectangle in histogram", lc("largest-rectangle-in-histogram"), MONO, minutes=45, priority=10, cost=1.3),
        m("Maximal rectangle (in matrix)", lc("maximal-rectangle"), MONO, minutes=50, priority=8, cost=1.3, notes="Histogram per row."),
    ]

    # ═══ Step 9.4: Stack/Queue implementation problems (6) ═══
    SQI = "DSA · Stack & Queue (implementation)"
    items += [
        m("Sliding window maximum", lc("sliding-window-maximum"), SQI, minutes=40, priority=10, notes="Monotonic deque of indices."),
        m("Stock span problem", lc("online-stock-span"), SQI, minutes=30, priority=7),
        m("The celebrity problem", gfg("the-celebrity-problem"), SQI, minutes=30, priority=7),
        m("LRU cache", lc("lru-cache"), SQI, minutes=45, priority=10, notes="HashMap + DLL. All O(1)."),
        m("LFU cache", lc("lfu-cache"), SQI, minutes=60, priority=7, cost=1.3),
        m("Rotting oranges (BFS)", lc("rotting-oranges"), SQI, minutes=35, priority=8),
    ]

    # ═══ Step 10: Sliding window / Two pointer (13) ═══
    SW = "DSA · Sliding window & two pointer"
    items += [
        m("Longest substring w/o repeat", lc("longest-substring-without-repeating-characters"), SW, minutes=30, priority=10),
        m("Max consecutive ones III", lc("max-consecutive-ones-iii"), SW, minutes=30, priority=8, notes="≤K zeros window."),
        m("Fruit into baskets", lc("fruit-into-baskets"), SW, minutes=30, priority=7),
        m("Longest repeating char replacement", lc("longest-repeating-character-replacement"), SW, minutes=35, priority=8),
        m("Binary subarrays with sum", lc("binary-subarrays-with-sum"), SW, minutes=35, priority=7, notes="atMost(K)-atMost(K-1)."),
        m("Count nice subarrays", lc("count-number-of-nice-subarrays"), SW, minutes=30, priority=7),
        m("Substrings containing all 3 chars", lc("number-of-substrings-containing-all-three-characters"), SW, minutes=30, priority=7),
        m("Maximum points from cards", lc("maximum-points-you-can-obtain-from-cards"), SW, minutes=25, priority=7),
        m("Longest substring with ≤K distinct", gfg("find-the-longest-substring-with-k-unique-characters-in-a-given-string"), SW, minutes=35, priority=8),
        m("Subarrays with K different ints", lc("subarrays-with-k-different-integers"), SW, minutes=45, priority=8),
        m("Minimum window substring", lc("minimum-window-substring"), SW, minutes=50, priority=10, cost=1.3),
        m("Minimum window subsequence", gfg("minimum-window-subsequence"), SW, minutes=45, priority=6),
        m("Permutation in string", lc("permutation-in-string"), SW, minutes=30, priority=7),
    ]

    # ═══ Step 11.1: Heaps basics (4) ═══
    HP1 = "DSA · Heaps (basics)"
    items += [
        m("Priority queue & binary heap intro", "https://www.youtube.com/watch?v=NSGEA-z1RtM", HP1, minutes=45, priority=9, type="video"),
        m("Implement min/max heap", gfg("binary-heap"), HP1, minutes=45, priority=7),
        m("Check array is min-heap", gfg("how-to-check-if-a-given-array-represents-a-binary-heap"), HP1, minutes=20, priority=5),
        m("Convert min-heap to max-heap", gfg("convert-min-heap-to-max-heap"), HP1, minutes=20, priority=5),
    ]

    # ═══ Step 11.2: Heaps medium (8) ═══
    HP2 = "DSA · Heaps (medium)"
    items += [
        m("Kth largest in array", lc("kth-largest-element-in-an-array"), HP2, minutes=25, priority=9),
        m("Kth smallest in array", gfg("kth-smallestlargest-element-unsorted-array"), HP2, minutes=25, priority=7),
        m("Sort K-sorted array", gfg("nearly-sorted-algorithm"), HP2, minutes=25, priority=7),
        m("Merge K sorted lists", lc("merge-k-sorted-lists"), HP2, minutes=40, priority=9),
        m("Replace each by its rank", gfg("replace-elements-array-corresponding-rank"), HP2, minutes=25, priority=5),
        m("Task scheduler", lc("task-scheduler"), HP2, minutes=40, priority=8),
        m("Hand of straights", lc("hand-of-straights"), HP2, minutes=35, priority=6),
        m("Top K frequent elements", lc("top-k-frequent-elements"), HP2, minutes=30, priority=9),
    ]

    # ═══ Step 11.3: Heaps hard (6) ═══
    HP3 = "DSA · Heaps (hard)"
    items += [
        m("Design Twitter", lc("design-twitter"), HP3, minutes=45, priority=7),
        m("Connect ropes with min cost", gfg("connect-n-ropes-minimum-cost"), HP3, minutes=25, priority=6),
        m("Kth largest in stream", lc("kth-largest-element-in-a-stream"), HP3, minutes=30, priority=8),
        m("Max sum combination", gfg("max-sum-combinations"), HP3, minutes=35, priority=6),
        m("Find median from data stream", lc("find-median-from-data-stream"), HP3, minutes=40, priority=10),
        m("K closest points to origin", lc("k-closest-points-to-origin"), HP3, minutes=30, priority=8),
    ]

    # ═══ Step 12: Greedy (16) ═══
    GR = "DSA · Greedy"
    items += [
        m("Assign cookies", lc("assign-cookies"), GR, minutes=20, priority=6),
        m("Fractional knapsack", gfg("fractional-knapsack-problem"), GR, minutes=25, priority=7),
        m("Min coins (greedy)", gfg("greedy-algorithm-to-find-minimum-number-of-coins"), GR, minutes=25, priority=6),
        m("Lemonade change", lc("lemonade-change"), GR, minutes=20, priority=6),
        m("Valid parens checker (greedy)", lc("valid-parenthesis-string"), GR, minutes=30, priority=7),
        m("N meetings in one room", gfg("find-maximum-meetings-in-one-room"), GR, minutes=25, priority=8, notes="Sort by end time."),
        m("Jump game I", lc("jump-game"), GR, minutes=25, priority=9),
        m("Jump game II", lc("jump-game-ii"), GR, minutes=30, priority=9),
        m("Min platforms", gfg("minimum-number-platforms-required-railwaybus-station"), GR, minutes=30, priority=7),
        m("Job sequencing", gfg("job-sequencing-problem"), GR, minutes=35, priority=7),
        m("Candy", lc("candy"), GR, minutes=40, priority=8, cost=1.2, notes="Two passes."),
        m("Shortest job first scheduling", gfg("program-for-shortest-job-first-or-sjf-cpu-scheduling-set-1-non-preemptive"), GR, minutes=25, priority=5),
        m("LRU page replacement", gfg("program-for-least-recently-used-lru-page-replacement-algorithm"), GR, minutes=25, priority=5),
        m("Insert interval", lc("insert-interval"), GR, minutes=30, priority=8),
        m("Merge intervals", lc("merge-intervals"), GR, minutes=30, priority=9),
        m("Non-overlapping intervals", lc("non-overlapping-intervals"), GR, minutes=30, priority=8),
        m("Gas station (circular)", lc("gas-station"), GR, minutes=30, priority=8),
    ]

    # ═══ Step 13.1: Binary Trees traversals (13) ═══
    TR1 = "DSA · Binary trees (traversals)"
    items += [
        m("Intro to trees", "https://www.youtube.com/watch?v=_ANrF3FJm7I", TR1, minutes=30, priority=7, type="video"),
        m("BT representation C++/Java", gfg("binary-tree-set-1-introduction"), TR1, minutes=20, priority=5, type="reading"),
        m("Preorder traversal (recursive)", lc("binary-tree-preorder-traversal"), TR1, minutes=15, priority=8),
        m("Inorder traversal (recursive)", lc("binary-tree-inorder-traversal"), TR1, minutes=15, priority=9),
        m("Postorder traversal (recursive)", lc("binary-tree-postorder-traversal"), TR1, minutes=15, priority=8),
        m("Level-order BFS", lc("binary-tree-level-order-traversal"), TR1, minutes=25, priority=10),
        m("Iterative preorder", lc("binary-tree-preorder-traversal"), TR1, minutes=25, priority=7),
        m("Iterative inorder", lc("binary-tree-inorder-traversal"), TR1, minutes=30, priority=8),
        m("Postorder using 2 stacks", gfg("iterative-postorder-traversal"), TR1, minutes=30, priority=6),
        m("Postorder using 1 stack", gfg("iterative-postorder-traversal-using-stack"), TR1, minutes=35, priority=6),
        m("Pre+In+Post in single traversal", gfg("preorder-inorder-postorder-traversal-of-binary-tree-using-1-stack"), TR1, minutes=30, priority=6),
    ]

    # ═══ Step 13.2: Binary Trees medium (12) ═══
    TR2 = "DSA · Binary trees (medium)"
    items += [
        m("Max depth of BT", lc("maximum-depth-of-binary-tree"), TR2, minutes=15, priority=8),
        m("Check balanced BT", lc("balanced-binary-tree"), TR2, minutes=25, priority=8, notes="O(n) early-exit return -1 on imbalance."),
        m("Diameter of BT", lc("diameter-of-binary-tree"), TR2, minutes=30, priority=9),
        m("Max path sum", lc("binary-tree-maximum-path-sum"), TR2, minutes=40, priority=9, cost=1.2),
        m("Same tree", lc("same-tree"), TR2, minutes=15, priority=7),
        m("Zig-zag traversal", lc("binary-tree-zigzag-level-order-traversal"), TR2, minutes=30, priority=7),
        m("Boundary traversal", lc("boundary-of-binary-tree"), TR2, minutes=40, priority=7, cost=1.2),
        m("Vertical order traversal", lc("vertical-order-traversal-of-a-binary-tree"), TR2, minutes=40, priority=7),
        m("Top view of BT", gfg("print-nodes-top-view-binary-tree"), TR2, minutes=30, priority=7),
        m("Bottom view of BT", gfg("bottom-view-binary-tree"), TR2, minutes=30, priority=7),
        m("Right/left view of BT", lc("binary-tree-right-side-view"), TR2, minutes=30, priority=8),
        m("Symmetric BT", lc("symmetric-tree"), TR2, minutes=20, priority=7),
    ]

    # ═══ Step 13.3: Binary Trees hard (14) ═══
    TR3 = "DSA · Binary trees (hard)"
    items += [
        m("Root-to-node path in BT", gfg("print-path-root-given-node-binary-tree"), TR3, minutes=30, priority=7),
        m("LCA in BT", lc("lowest-common-ancestor-of-a-binary-tree"), TR3, minutes=35, priority=10),
        m("Maximum width of BT", lc("maximum-width-of-binary-tree"), TR3, minutes=40, priority=8),
        m("Children sum property", gfg("check-children-sum-property-binary-tree"), TR3, minutes=35, priority=6),
        m("All nodes distance K", lc("all-nodes-distance-k-in-binary-tree"), TR3, minutes=45, priority=8, cost=1.2),
        m("Min time to burn tree", gfg("minimum-time-to-burn-binary-tree-starting-leaf-node"), TR3, minutes=45, priority=7),
        m("Count nodes in complete BT", lc("count-complete-tree-nodes"), TR3, minutes=35, priority=7, notes="O(log²n) with height."),
        m("Requirements to uniquely build BT (theory)", gfg("if-you-are-given-two-traversal-sequences-can-you-construct-the-binary-tree"), TR3, minutes=20, priority=5, type="reading"),
        m("Build BT from preorder + inorder", lc("construct-binary-tree-from-preorder-and-inorder-traversal"), TR3, minutes=40, priority=9),
        m("Build BT from postorder + inorder", lc("construct-binary-tree-from-inorder-and-postorder-traversal"), TR3, minutes=40, priority=7),
        m("Serialize/deserialize BT", lc("serialize-and-deserialize-binary-tree"), TR3, minutes=45, priority=8),
        m("Morris preorder", gfg("morris-traversal-for-preorder"), TR3, minutes=40, priority=6),
        m("Morris inorder (O(1) space)", gfg("inorder-tree-traversal-without-recursion-and-without-stack"), TR3, minutes=40, priority=7, cost=1.2),
        m("Flatten BT to linked list", lc("flatten-binary-tree-to-linked-list"), TR3, minutes=35, priority=8),
    ]

    # ═══ Step 14: BST (16) ═══
    BST = "DSA · BST"
    items += [
        m("Intro to BST", "https://www.youtube.com/watch?v=p7-9UvDQZ3w", BST, minutes=30, priority=7, type="video"),
        m("Search in BST", lc("search-in-a-binary-search-tree"), BST, minutes=20, priority=8),
        m("Min/Max in BST", gfg("find-the-minimum-element-in-a-binary-search-tree"), BST, minutes=15, priority=6),
        m("Ceil in BST", gfg("ceil-bst"), BST, minutes=25, priority=6),
        m("Floor in BST", gfg("floor-binary-search-tree-bst"), BST, minutes=25, priority=6),
        m("Insert into BST", lc("insert-into-a-binary-search-tree"), BST, minutes=25, priority=7),
        m("Delete node in BST", lc("delete-node-in-a-bst"), BST, minutes=40, priority=8, cost=1.2),
        m("Kth smallest in BST", lc("kth-smallest-element-in-a-bst"), BST, minutes=25, priority=8),
        m("Kth largest in BST", gfg("kth-largest-element-in-bst-when-modification-to-bst-is-not-allowed"), BST, minutes=25, priority=6),
        m("Validate BST", lc("validate-binary-search-tree"), BST, minutes=30, priority=10),
        m("LCA in BST", lc("lowest-common-ancestor-of-a-binary-search-tree"), BST, minutes=20, priority=8),
        m("Construct BST from preorder", lc("construct-binary-search-tree-from-preorder-traversal"), BST, minutes=35, priority=7),
        m("Inorder successor/predecessor in BST", gfg("inorder-successor-in-binary-search-tree"), BST, minutes=30, priority=6),
        m("Merge 2 BSTs", gfg("merge-two-bsts-with-limited-extra-space"), BST, minutes=40, priority=6),
        m("Two sum in BST", lc("two-sum-iv-input-is-a-bst"), BST, minutes=30, priority=7),
        m("Recover BST (2 swapped)", lc("recover-binary-search-tree"), BST, minutes=35, priority=7),
        m("Largest BST in BT", gfg("largest-bst-binary-tree-set-2"), BST, minutes=45, priority=7, cost=1.2),
    ]

    # ═══ Step 15.1: Graphs basics (6) ═══
    G1 = "DSA · Graphs (basics)"
    items += [
        m("Graphs intro & types", "https://www.youtube.com/watch?v=M3_pLsDdeuU", G1, minutes=30, priority=8, type="video"),
        m("Graph representation (adj list/matrix)", gfg("graph-and-its-representations"), G1, minutes=25, priority=7),
        m("Connected components", gfg("connected-components-in-an-undirected-graph"), G1, minutes=30, priority=7),
        m("BFS traversal", lc("breadth-first-search-or-bfs-for-a-graph"), G1, minutes=30, priority=9),
        m("DFS traversal", gfg("depth-first-search-or-dfs-for-a-graph"), G1, minutes=30, priority=9),
    ]

    # ═══ Step 15.2: Graphs BFS/DFS problems (13) ═══
    G2 = "DSA · Graphs (BFS/DFS)"
    items += [
        m("Number of provinces", lc("number-of-provinces"), G2, minutes=25, priority=8),
        m("Number of islands (matrix CC)", lc("number-of-islands"), G2, minutes=30, priority=10),
        m("Rotting oranges", lc("rotting-oranges"), G2, minutes=35, priority=9),
        m("Flood fill", lc("flood-fill"), G2, minutes=20, priority=7),
        m("Cycle detection in undirected (BFS)", gfg("detect-cycle-in-an-undirected-graph"), G2, minutes=35, priority=8),
        m("Cycle detection in undirected (DFS)", gfg("detect-cycle-undirected-graph"), G2, minutes=35, priority=8),
        m("01 matrix (multi-source BFS)", lc("01-matrix"), G2, minutes=35, priority=8),
        m("Surrounded regions (DFS)", lc("surrounded-regions"), G2, minutes=35, priority=8),
        m("Number of enclaves", lc("number-of-enclaves"), G2, minutes=30, priority=7),
        m("Word ladder I", lc("word-ladder"), G2, minutes=45, priority=8),
        m("Word ladder II", lc("word-ladder-ii"), G2, minutes=60, priority=7, cost=1.3),
        m("Number of distinct islands", gfg("find-number-of-islands"), G2, minutes=40, priority=7),
        m("Bipartite check (DFS/BFS)", lc("is-graph-bipartite"), G2, minutes=35, priority=8),
        m("Cycle detection in directed (DFS)", gfg("detect-cycle-in-a-graph"), G2, minutes=35, priority=8),
    ]

    # ═══ Step 15.3: Topo Sort (7) ═══
    G3 = "DSA · Graphs (topo sort)"
    items += [
        m("Topological sort (DFS)", gfg("topological-sorting"), G3, minutes=30, priority=8),
        m("Kahn's algorithm (BFS topo)", gfg("topological-sorting-indegree-based-solution"), G3, minutes=30, priority=9),
        m("Cycle detection in directed (BFS)", gfg("detect-cycle-in-a-graph"), G3, minutes=30, priority=8, notes="Kahn's: if topo length < V, cycle."),
        m("Course schedule I", lc("course-schedule"), G3, minutes=35, priority=10),
        m("Course schedule II", lc("course-schedule-ii"), G3, minutes=30, priority=9),
        m("Find eventual safe states", lc("find-eventual-safe-states"), G3, minutes=40, priority=7),
        m("Alien dictionary", lc("alien-dictionary"), G3, minutes=45, priority=8, cost=1.2),
    ]

    # ═══ Step 15.4: Shortest Path (13) ═══
    G4 = "DSA · Graphs (shortest path)"
    items += [
        m("Shortest path in unit-weight UG", gfg("shortest-path-unweighted-graph"), G4, minutes=30, priority=7, notes="BFS suffices."),
        m("Shortest path in DAG (topo+relax)", gfg("shortest-path-for-directed-acyclic-graphs"), G4, minutes=35, priority=7),
        m("Dijkstra (priority queue)", "https://www.youtube.com/watch?v=V6H1qAeB-l4", G4, minutes=50, priority=10, type="video"),
        m("Why PQ in Dijkstra (theory)", gfg("dijkstras-shortest-path-algorithm-greedy-algo-7"), G4, minutes=20, priority=6, type="reading"),
        m("Shortest path in binary maze", lc("shortest-path-in-binary-matrix"), G4, minutes=35, priority=8),
        m("Path with min effort", lc("path-with-minimum-effort"), G4, minutes=40, priority=8),
        m("Cheapest flights within K stops", lc("cheapest-flights-within-k-stops"), G4, minutes=45, priority=9),
        m("Network delay time", lc("network-delay-time"), G4, minutes=30, priority=8),
        m("Number of ways to arrive at dest", lc("number-of-ways-to-arrive-at-destination"), G4, minutes=40, priority=7),
        m("Min multiplications to reach end", gfg("minimum-multiplications-to-reach-end"), G4, minutes=35, priority=6),
        m("Bellman-Ford", "https://www.youtube.com/watch?v=0vVofAhAYjc", G4, minutes=40, priority=8, type="video"),
        m("Floyd-Warshall", gfg("floyd-warshall-algorithm-dp-16"), G4, minutes=35, priority=7),
        m("Find city with smallest neighbors in threshold", lc("find-the-city-with-the-smallest-number-of-neighbors-at-a-threshold-distance"), G4, minutes=40, priority=7),
    ]

    # ═══ Step 15.5: MST / DSU (10) ═══
    G5 = "DSA · Graphs (MST & DSU)"
    items += [
        m("Min spanning tree (theory)", gfg("minimum-spanning-tree"), G5, minutes=25, priority=7, type="reading"),
        m("Prim's algorithm", gfg("prims-minimum-spanning-tree-mst-greedy-algo-5"), G5, minutes=40, priority=8),
        m("DSU (union by rank)", "https://www.youtube.com/watch?v=aBxjDBC4M1U", G5, minutes=45, priority=9, type="video"),
        m("DSU (union by size)", gfg("union-find-algorithm-set-2-union-by-rank"), G5, minutes=30, priority=8),
        m("Kruskal's algorithm", gfg("kruskals-minimum-spanning-tree-algorithm-greedy-algo-2"), G5, minutes=35, priority=8),
        m("Operations to make network connected", lc("number-of-operations-to-make-network-connected"), G5, minutes=30, priority=8),
        m("Most stones removed (same row/col)", lc("most-stones-removed-with-same-rows-or-columns"), G5, minutes=40, priority=7),
        m("Accounts merge", lc("accounts-merge"), G5, minutes=45, priority=8, cost=1.2),
        m("Number of islands II", lc("number-of-islands-ii"), G5, minutes=45, priority=7, cost=1.2),
        m("Making a large island", lc("making-a-large-island"), G5, minutes=50, priority=7, cost=1.3),
        m("Swim in rising water", lc("swim-in-rising-water"), G5, minutes=40, priority=7),
    ]

    # ═══ Step 15.6: Tarjan / Kosaraju (5) ═══
    G6 = "DSA · Graphs (Tarjan & Kosaraju)"
    items += [
        m("Bridges in graph (Tarjan)", lc("critical-connections-in-a-network"), G6, minutes=50, priority=7, cost=1.3),
        m("Articulation points", gfg("articulation-points-or-cut-vertices-in-a-graph"), G6, minutes=45, priority=6, cost=1.2),
        m("Kosaraju (SCC)", gfg("strongly-connected-components"), G6, minutes=45, priority=7),
        m("Tarjan SCC", gfg("tarjan-algorithm-find-strongly-connected-components"), G6, minutes=45, priority=6),
        m("Mother vertex", gfg("find-a-mother-vertex-in-a-graph"), G6, minutes=35, priority=5),
    ]

    # ═══ Step 16.0: DP Intro (1) ═══
    DP0 = "DSA · DP (intro)"
    items += [
        m("DP intro — memo vs tabulation", "https://www.youtube.com/watch?v=tyB0ztf0DNY", DP0, minutes=60, priority=10, type="video", cost=1.2),
    ]

    # ═══ Step 16.1: 1D DP (5) ═══
    DP1 = "DSA · DP (1D)"
    items += [
        m("Climbing stairs", lc("climbing-stairs"), DP1, minutes=20, priority=9),
        m("Frog jump", gfg("frog-jump-dp-3"), DP1, minutes=25, priority=8),
        m("Frog jump with K distance", gfg("minimal-cost-frog-jump-k-distance"), DP1, minutes=30, priority=7),
        m("Max sum non-adjacent (DP-5)", lc("house-robber"), DP1, minutes=25, priority=9),
        m("House robber II (circular)", lc("house-robber-ii"), DP1, minutes=25, priority=8),
    ]

    # ═══ Step 16.2: 2D/3D Grid DP (7) ═══
    DP2 = "DSA · DP (2D / Grids)"
    items += [
        m("Ninja's training (3 activities)", gfg("geek-ninja-training"), DP2, minutes=35, priority=7),
        m("Unique paths I", lc("unique-paths"), DP2, minutes=25, priority=8),
        m("Unique paths II (obstacles)", lc("unique-paths-ii"), DP2, minutes=25, priority=7),
        m("Min path sum in grid", lc("minimum-path-sum"), DP2, minutes=30, priority=8),
        m("Triangle min path sum", lc("triangle"), DP2, minutes=30, priority=7),
        m("Min/Max falling path sum", lc("minimum-falling-path-sum"), DP2, minutes=35, priority=7),
        m("Cherry pickup II (3D)", lc("cherry-pickup-ii"), DP2, minutes=50, priority=7, cost=1.3),
    ]

    # ═══ Step 16.3: DP Subsequences (11) ═══
    DP3 = "DSA · DP (subsequences)"
    items += [
        m("Subset sum equal to target", gfg("subset-sum-problem"), DP3, minutes=35, priority=9),
        m("Partition equal subset sum", lc("partition-equal-subset-sum"), DP3, minutes=35, priority=9),
        m("Partition into 2 with min abs diff", gfg("partition-a-set-into-two-subsets-such-that-the-difference-of-subset-sums-is-minimum"), DP3, minutes=40, priority=7),
        m("Count subsets with sum K", gfg("count-subsets-given-sum"), DP3, minutes=35, priority=8),
        m("Partitions with given difference", gfg("partitions-set-equal-given-difference"), DP3, minutes=35, priority=7),
        m("0/1 Knapsack", gfg("0-1-knapsack-problem-dp-10"), DP3, minutes=40, priority=10, notes="Foundational."),
        m("Min coins (DP)", lc("coin-change"), DP3, minutes=35, priority=10),
        m("Target sum", lc("target-sum"), DP3, minutes=35, priority=8),
        m("Coin change II (# ways)", lc("coin-change-ii"), DP3, minutes=30, priority=8),
        m("Unbounded knapsack", gfg("unbounded-knapsack-repetition-items-allowed"), DP3, minutes=35, priority=8),
        m("Rod cutting", gfg("cutting-a-rod-dp-13"), DP3, minutes=30, priority=7),
    ]

    # ═══ Step 16.4: DP on Strings (10) ═══
    DP4 = "DSA · DP (strings)"
    items += [
        m("Longest common subsequence", lc("longest-common-subsequence"), DP4, minutes=40, priority=10),
        m("Print LCS", gfg("printing-longest-common-subsequence"), DP4, minutes=35, priority=7),
        m("Longest common substring", gfg("longest-common-substring-dp-29"), DP4, minutes=35, priority=8),
        m("Longest palindromic subseq", lc("longest-palindromic-subsequence"), DP4, minutes=30, priority=8, notes="LCS(s, reverse(s))."),
        m("Min insertions to make palindrome", lc("minimum-insertion-steps-to-make-a-string-palindrome"), DP4, minutes=30, priority=7),
        m("Min insert/delete to convert", lc("delete-operation-for-two-strings"), DP4, minutes=30, priority=7),
        m("Shortest common supersequence", lc("shortest-common-supersequence"), DP4, minutes=40, priority=7),
        m("Distinct subsequences", lc("distinct-subsequences"), DP4, minutes=40, priority=7, cost=1.2),
        m("Edit distance", lc("edit-distance"), DP4, minutes=40, priority=10, cost=1.2),
        m("Wildcard matching", lc("wildcard-matching"), DP4, minutes=45, priority=7, cost=1.2),
    ]

    # ═══ Step 16.5: DP on Stocks (6) ═══
    DP5 = "DSA · DP (stocks)"
    items += [
        m("Stock buy/sell I", lc("best-time-to-buy-and-sell-stock"), DP5, minutes=25, priority=9),
        m("Stock buy/sell II (unlimited)", lc("best-time-to-buy-and-sell-stock-ii"), DP5, minutes=30, priority=8),
        m("Stock buy/sell III (≤2 txns)", lc("best-time-to-buy-and-sell-stock-iii"), DP5, minutes=40, priority=8),
        m("Stock buy/sell IV (≤K txns)", lc("best-time-to-buy-and-sell-stock-iv"), DP5, minutes=45, priority=7),
        m("Stock with cooldown", lc("best-time-to-buy-and-sell-stock-with-cooldown"), DP5, minutes=35, priority=7),
        m("Stock with transaction fee", lc("best-time-to-buy-and-sell-stock-with-transaction-fee"), DP5, minutes=30, priority=7),
    ]

    # ═══ Step 16.6: DP on LIS (7) ═══
    DP6 = "DSA · DP (LIS)"
    items += [
        m("Longest increasing subseq (LIS O(n²))", lc("longest-increasing-subsequence"), DP6, minutes=35, priority=10),
        m("Print LIS", gfg("printing-longest-increasing-subsequence"), DP6, minutes=30, priority=7),
        m("LIS using binary search (O(n log n))", lc("longest-increasing-subsequence"), DP6, minutes=40, priority=9, cost=1.2),
        m("Largest divisible subset", lc("largest-divisible-subset"), DP6, minutes=35, priority=7),
        m("Longest string chain", lc("longest-string-chain"), DP6, minutes=35, priority=7),
        m("Longest bitonic subseq", gfg("longest-bitonic-subsequence-dp-15"), DP6, minutes=35, priority=6),
        m("Number of LIS", lc("number-of-longest-increasing-subsequence"), DP6, minutes=40, priority=7),
    ]

    # ═══ Step 16.7: DP MCM / Partition (7) ═══
    DP7 = "DSA · DP (MCM / partition)"
    items += [
        m("Matrix chain multiplication", gfg("matrix-chain-multiplication-dp-8"), DP7, minutes=40, priority=7),
        m("MCM bottom-up", gfg("matrix-chain-multiplication-set-2"), DP7, minutes=35, priority=6),
        m("Min cost to cut a stick", lc("minimum-cost-to-cut-a-stick"), DP7, minutes=40, priority=7),
        m("Burst balloons", lc("burst-balloons"), DP7, minutes=50, priority=8, cost=1.3),
        m("Boolean expression evaluation", gfg("boolean-parenthesization-problem-dp-37"), DP7, minutes=45, priority=6, cost=1.2),
        m("Palindrome partitioning II", lc("palindrome-partitioning-ii"), DP7, minutes=45, priority=7, cost=1.2),
        m("Partition array for max sum", lc("partition-array-for-maximum-sum"), DP7, minutes=40, priority=7),
    ]

    # ═══ Step 16.8: DP on Squares (3) ═══
    DP8 = "DSA · DP (squares)"
    items += [
        m("Maximal rectangle of 1s", lc("maximal-rectangle"), DP8, minutes=50, priority=8, cost=1.3),
        m("Count square submatrices of 1s", lc("count-square-submatrices-with-all-ones"), DP8, minutes=35, priority=7),
        m("Maximal square", lc("maximal-square"), DP8, minutes=30, priority=8),
    ]

    # ═══ Step 17: Tries (7) ═══
    TRIE = "DSA · Tries"
    items += [
        m("Implement Trie (insert/search/startsWith)", lc("implement-trie-prefix-tree"), TRIE, minutes=35, priority=9),
        m("Trie II (count prefix/insert/erase)", "https://www.codingninjas.com/studio/problems/implement-trie_1387095", TRIE, minutes=40, priority=7),
        m("Longest string with all prefixes", gfg("longest-word-with-all-prefixes"), TRIE, minutes=35, priority=6),
        m("Number of distinct substrings (Trie)", gfg("count-distinct-substrings-string-using-suffix-trie"), TRIE, minutes=40, priority=6),
        m("Bit prereqs for trie problems", gfg("bitwise-operators-in-c-cpp"), TRIE, minutes=20, priority=5, type="reading"),
        m("Max XOR of two numbers", lc("maximum-xor-of-two-numbers-in-an-array"), TRIE, minutes=40, priority=7),
        m("Max XOR with element from array", lc("maximum-xor-with-an-element-from-array"), TRIE, minutes=45, priority=6),
        m("Word search II (Trie + DFS)", lc("word-search-ii"), TRIE, minutes=50, priority=8, cost=1.2),
    ]

    # ═══ Step 18: Strings hard (10) ═══
    SH = "DSA · Strings II (hard)"
    items += [
        m("Min bracket reversals to balance", gfg("minimum-number-of-bracket-reversals-needed-to-make-an-expression-balanced"), SH, minutes=30, priority=6),
        m("Count and say", lc("count-and-say"), SH, minutes=30, priority=6),
        m("Hashing in strings (theory)", gfg("string-hashing-using-polynomial-rolling-hash-function"), SH, minutes=30, priority=6, type="reading"),
        m("Rabin-Karp", "https://cp-algorithms.com/string/rabin-karp.html", SH, minutes=45, priority=7, type="reading"),
        m("Z-function", "https://cp-algorithms.com/string/z-function.html", SH, minutes=40, priority=6, type="reading"),
        m("KMP / LPS array", "https://www.youtube.com/watch?v=V5-7GzOfADQ", SH, minutes=60, priority=8, type="video", cost=1.3),
        m("Shortest palindrome", lc("shortest-palindrome"), SH, minutes=45, priority=7, cost=1.2),
        m("Longest happy prefix", lc("longest-happy-prefix"), SH, minutes=40, priority=6),
        m("Count palindromic subsequences", lc("count-different-palindromic-subsequences"), SH, minutes=45, priority=6, cost=1.2),
        m("Find occurrences of pattern (KMP)", lc("find-the-index-of-the-first-occurrence-in-a-string"), SH, minutes=30, priority=7),
    ]

    DSA_TRACK["materials"] = items


# ============================================================================
# Math for AI — Deisenroth + 3B1B + Imperial Coursera
# ============================================================================

MATH_TRACK = {
    "slug": "ai-math",
    "name": "Mathematics for AI",
    "description": "Deisenroth/Faisal/Ong MML paired with 3Blue1Brown intuition. 10 chapters spanning linear algebra → optimization → probability.",
    "color": "#a87f9e",
    "cognitive_multiplier": 1.4,
    "is_system": False,
    "materials": [],
}


def add_math():
    items: list[dict[str, Any]] = []

    # Block 0 — Gentle on-ramp: StatQuest + Khan Academy
    # (Added from learn-ai-engineering recommendations — accessible primers before MML)
    SQ = "Math · Foundations · StatQuest & Khan Academy"
    items += _statquest_stats_sessions(SQ)
    items += _statquest_ml_sessions(SQ)
    items += [
        m("Khan Academy — Probability & Statistics", "https://www.khanacademy.org/math/statistics-probability", SQ, minutes=180, priority=7, type="course", notes="Self-paced. Skip what you know; lock in conditional probability + sampling distributions."),
        m("Mathematics for Machine Learning Specialization (Coursera)", "https://www.coursera.org/specializations/mathematics-machine-learning", SQ, minutes=600, priority=7, type="course", cost=1.2, notes="3-course Imperial College spec: Linear Algebra → Multivariate Calculus → PCA. Run in parallel with MML book."),
    ]

    LA = "Math · Week 1-3 · Linear Algebra"
    items += [
        m("MML book — Chapter 2: Linear Algebra", "https://mml-book.github.io/book/mml-book.pdf", LA, minutes=120, priority=9, type="reading", cost=1.3, notes="Vector spaces, linear independence, basis, rank, linear maps. Work the exercises."),
        m("3B1B EOLA — Ch 1: Vectors", "https://www.youtube.com/watch?v=fNk_zzaMoSs", LA, minutes=15, priority=9, type="video", notes="Geometric intuition: vector as arrow, as list, as function. Bedrock."),
        m("3B1B EOLA — Ch 2: Linear combinations, span, basis", "https://www.youtube.com/watch?v=k7RM-ot2NWY", LA, minutes=15, priority=9, type="video", notes="Span = all linear combos. Basis = minimal spanning set."),
        m("3B1B EOLA — Ch 3: Linear transformations & matrices", "https://www.youtube.com/watch?v=kYB8IZa5AuE", LA, minutes=15, priority=10, type="video", notes="Matrix = where basis vectors land. Multiplication = composition."),
        m("3B1B EOLA — Ch 4: Matrix multiplication", "https://www.youtube.com/watch?v=XkY2DOUCWMU", LA, minutes=15, priority=9, type="video", notes="Order matters. Composition of transformations."),
        m("3B1B EOLA — Ch 5: 3D linear transformations", "https://www.youtube.com/watch?v=rHLEWRxRGiM", LA, minutes=10, priority=7, type="video"),
        m("3B1B EOLA — Ch 6: Determinant", "https://www.youtube.com/watch?v=Ip3X9LOh2dk", LA, minutes=15, priority=9, type="video", notes="Det = factor by which area/volume scales. Det = 0 iff matrix collapses dimension."),
        m("3B1B EOLA — Ch 7: Inverse, column space, null space, rank", "https://www.youtube.com/watch?v=uQhTuRlWMxw", LA, minutes=15, priority=10, type="video", notes="rank = dim of column space. null space = solutions to Ax=0. Critical for understanding linear systems."),
        m("3B1B EOLA — Ch 9: Dot products & duality", "https://www.youtube.com/watch?v=LyGKycYT2v0", LA, minutes=15, priority=8, type="video", notes="Dot product = projection × length. Connection to dual vectors."),
        m("3B1B EOLA — Ch 10: Cross products", "https://www.youtube.com/watch?v=eu6i7WJeinw", LA, minutes=10, priority=6, type="video"),
        m("3B1B EOLA — Ch 13: Change of basis", "https://www.youtube.com/watch?v=P2LTAUO1TdA", LA, minutes=15, priority=8, type="video", notes="Same transformation, different coordinate systems. P⁻¹AP."),
        m("3B1B EOLA — Ch 14: Eigenvectors & eigenvalues", "https://www.youtube.com/watch?v=PFDu9oVAE-g", LA, minutes=20, priority=10, type="video", notes="v such that Av = λv. Diagonalization. Core for PCA, attention, stability."),
        m("3B1B EOLA — Ch 15: Abstract vector spaces", "https://www.youtube.com/watch?v=TgKwz5Ikpc8", LA, minutes=15, priority=7, type="video"),
        m("Imperial College — Linear Algebra (Coursera)", "https://www.coursera.org/learn/linear-algebra-machine-learning", LA, minutes=90, priority=7, type="course", notes="Optional companion. Module 1-2 cover basics, module 3-5 are applied (PCA, Gram-Schmidt)."),
    ]

    AG = "Math · Week 4 · Analytic Geometry"
    items += [
        m("MML — Chapter 3: Analytic Geometry", "https://mml-book.github.io/book/mml-book.pdf", AG, minutes=120, priority=8, type="reading", cost=1.3, notes="Inner products, norms, distances, angles, orthogonal projections, rotations."),
        m("Orthogonal projection — derivation & code", "https://www.youtube.com/watch?v=27vT-NWuw0M", AG, minutes=30, priority=7, type="video", notes="Project b onto a: ((a·b)/(a·a))·a. Foundation of least squares."),
        m("Gram-Schmidt orthogonalization", "https://www.youtube.com/watch?v=zHbfZWZJTGc", AG, minutes=30, priority=7, type="video", notes="Build orthogonal basis from any basis. Subtract projections."),
    ]

    MD = "Math · Week 5 · Matrix Decompositions"
    items += [
        m("MML — Chapter 4: Matrix Decompositions", "https://mml-book.github.io/book/mml-book.pdf", MD, minutes=120, priority=9, type="reading", cost=1.4, notes="Determinant, trace, eigendecomposition, SVD, Cholesky."),
        m("SVD intuition (3B1B-style)", "https://www.youtube.com/watch?v=mBcLRGuAFUk", MD, minutes=20, priority=9, type="video", notes="A = UΣVᵀ. U,V orthogonal. Σ diagonal with singular values. Best low-rank approximation."),
        m("SVD applications — image compression, recommendations", "https://www.youtube.com/watch?v=DG7YTlGnCEo", MD, minutes=30, priority=7, type="video", notes="Truncated SVD keeps top-k singular values. Drastic compression with low loss."),
        m("Eigendecomposition vs SVD", "https://gregorygundersen.com/blog/2018/12/10/svd/", MD, minutes=25, priority=7, type="reading", notes="Eigen needs square + diagonalizable. SVD works for any matrix. PCA = eigen of cov = SVD of centered data."),
    ]

    VC = "Math · Week 6-7 · Vector Calculus"
    items += [
        m("MML — Chapter 5: Vector Calculus", "https://mml-book.github.io/book/mml-book.pdf", VC, minutes=150, priority=10, type="reading", cost=1.5, notes="Differentiation, partial derivatives, gradients, Jacobian, Hessian, chain rule, backprop foundation."),
        m("3B1B EOC — Ch 1: Essence of calculus", "https://www.youtube.com/watch?v=WUvTyaaNkzM", VC, minutes=20, priority=8, type="video"),
        m("3B1B EOC — Ch 4: Chain rule & product rule", "https://www.youtube.com/watch?v=YG15m2VwSjA", VC, minutes=15, priority=9, type="video", notes="Backprop is just the chain rule applied recursively."),
        m("Gradient & directional derivative", "https://www.youtube.com/watch?v=GkB4vW16QHI", VC, minutes=20, priority=9, type="video", notes="Gradient points in direction of steepest ascent. Magnitude = rate."),
        m("Jacobian matrix — multivariate derivative", "https://www.youtube.com/watch?v=AdV5w8CY3pw", VC, minutes=20, priority=8, type="video", notes="Matrix of partial derivatives. Generalizes derivative to vector-valued functions."),
        m("Hessian matrix — second-order curvature", "https://www.youtube.com/watch?v=LbBcuZukCAw", VC, minutes=20, priority=7, type="video", notes="Symmetric matrix of 2nd partials. Eigenvalues tell concavity/convexity."),
        m("Backpropagation from scratch (math)", "https://cs231n.github.io/optimization-2/", VC, minutes=60, priority=10, type="reading", cost=1.4, notes="Compute graph + chain rule. Each node receives gradient from output, distributes to inputs."),
        m("Matrix calculus cookbook", "https://en.wikipedia.org/wiki/Matrix_calculus", VC, minutes=45, priority=6, type="reading", notes="Reference for derivatives of common matrix expressions. Bookmark."),
    ]

    PROB = "Math · Week 8-9 · Probability"
    items += [
        m("MML — Chapter 6: Probability & Distributions", "https://mml-book.github.io/book/mml-book.pdf", PROB, minutes=180, priority=10, type="reading", cost=1.5, notes="Probability spaces, conditional, Bayes', expectation, variance, common distributions."),
        m("Bayes' theorem — intuitive proof (3B1B)", "https://www.youtube.com/watch?v=HZGCoVF3YvM", PROB, minutes=25, priority=10, type="video", notes="P(H|E) = P(E|H)P(H)/P(E). Backbone of probabilistic ML."),
        m("Probability distributions overview", "https://seeing-theory.brown.edu/probability-distributions/index.html", PROB, minutes=45, priority=8, type="reading", notes="Bernoulli, binomial, normal, Poisson, beta, dirichlet, exponential. Know shapes + use cases."),
        m("Normal distribution & central limit theorem", "https://www.youtube.com/watch?v=zeJD6dqJ5lo", PROB, minutes=30, priority=8, type="video", notes="Why Gaussians appear everywhere. Sum of iids → normal."),
        m("MLE — maximum likelihood estimation", "https://www.youtube.com/watch?v=XepXtl9YKwc", PROB, minutes=25, priority=9, type="video", notes="θ* = argmax P(data|θ). For Gaussian: sample mean & variance. Foundation of training."),
        m("MAP estimation & Bayesian inference", "https://www.youtube.com/watch?v=kkhdIriddSI", PROB, minutes=30, priority=8, type="video", notes="θ* = argmax P(θ|data) ∝ P(data|θ)P(θ). Prior regularizes."),
        m("KL divergence & cross-entropy", "https://www.youtube.com/watch?v=ErfnhcEV1O8", PROB, minutes=25, priority=10, type="video", notes="KL(P||Q) = Σ P(x) log(P(x)/Q(x)). Cross-entropy loss = KL up to constant. Why ML uses it everywhere."),
        m("Information theory primer (Shannon entropy)", "https://www.youtube.com/watch?v=ErfnhcEV1O8", PROB, minutes=30, priority=7, type="video", notes="H(X) = -Σ P(x)logP(x). Bits to encode optimally. Mutual information."),
        m("Conjugate priors", "https://en.wikipedia.org/wiki/Conjugate_prior", PROB, minutes=30, priority=6, type="reading", notes="Beta-binomial, Gaussian-Gaussian, Dirichlet-multinomial. Posterior in same family as prior."),
    ]

    OPT = "Math · Week 10 · Optimization"
    items += [
        m("MML — Chapter 7: Continuous Optimization", "https://mml-book.github.io/book/mml-book.pdf", OPT, minutes=150, priority=10, type="reading", cost=1.4, notes="Gradient descent, convexity, Lagrange multipliers, KKT conditions, duality."),
        m("Gradient descent variants (SGD, momentum, Adam)", "https://ruder.io/optimizing-gradient-descent/", OPT, minutes=60, priority=10, type="reading", notes="SGD → momentum → Nesterov → Adagrad → RMSprop → Adam → AdamW. Know what each fixes."),
        m("Convex optimization intro — Boyd lectures", "https://www.youtube.com/watch?v=GsBT5fSCmqg", OPT, minutes=90, priority=7, type="video", cost=1.3, notes="Stanford EE364A. Bookmark the textbook (free PDF)."),
        m("Why Adam works — visual explanation", "https://www.youtube.com/watch?v=JXQT_vxqwIs", OPT, minutes=30, priority=8, type="video", notes="Per-parameter learning rates from first/second moments. β1=0.9, β2=0.999 are sensible defaults."),
        m("Learning rate schedules", "https://www.jeremyjordan.me/nn-learning-rate/", OPT, minutes=30, priority=7, type="reading", notes="Cosine annealing, warmup, one-cycle. LR is the most important hyperparameter."),
    ]

    LIN = "Math · Week 11 · Linear Regression"
    items += [
        m("MML — Chapter 9: Linear Regression", "https://mml-book.github.io/book/mml-book.pdf", LIN, minutes=90, priority=8, type="reading", notes="Normal equations, MLE view, MAP view, Bayesian linear regression."),
        m("Linear regression from scratch (NumPy)", "https://www.youtube.com/watch?v=YwjjzVZ1Lws", LIN, minutes=45, priority=7, type="video", notes="Closed form θ = (XᵀX)⁻¹Xᵀy. Then implement with gradient descent."),
        m("Regularization — ridge & lasso", "https://www.youtube.com/watch?v=Q81RR3yKn30", LIN, minutes=30, priority=8, type="video", notes="L2 (ridge) shrinks. L1 (lasso) selects. Both improve generalization."),
    ]

    PCA = "Math · Week 12 · PCA & Dimensionality Reduction"
    items += [
        m("MML — Chapter 10: PCA", "https://mml-book.github.io/book/mml-book.pdf", PCA, minutes=90, priority=8, type="reading", notes="Maximize variance OR minimize reconstruction error → same answer. Eigen of cov matrix."),
        m("PCA step-by-step with code", "https://towardsdatascience.com/a-step-by-step-explanation-of-principal-component-analysis-b836fb9c97e2", PCA, minutes=45, priority=8, type="reading", notes="Center → cov → eigen → project. Or center → SVD → take top-k columns of V."),
        m("t-SNE & UMAP — nonlinear DR", "https://distill.pub/2016/misread-tsne/", PCA, minutes=45, priority=6, type="reading", notes="t-SNE preserves local structure. UMAP faster + better global. Use for viz, not features."),
    ]

    MATH_TRACK["materials"] = items


# ============================================================================
# LLM / ML — Andrew Ng + Karpathy + papers + builds
# ============================================================================

LLM_TRACK = {
    "slug": "llm-ml",
    "name": "LLM & Machine Learning",
    "description": "Bottom-up: classical ML → neural nets from scratch → transformers → LLM training → RAG → agents. Karpathy + papers + builds.",
    "color": "#e8a849",
    "cognitive_multiplier": 1.3,
    "is_system": False,
    "materials": [],
}


def add_llm():
    items: list[dict[str, Any]] = []

    # Phase 0 — Classical ML Foundation (added from learn-ai-engineering recs)
    # Before deep learning, lock in the core ML mental model + gradient-boosted trees.
    CM = "LLM/ML · Phase 0 · Classical ML Foundation"
    items += [
        m("Google — Machine Learning Crash Course", "https://developers.google.com/machine-learning/crash-course", CM, minutes=240, priority=8, type="course", notes="15-hour fast-paced intro: loss, gradient descent, overfitting, regularization, feature crosses, embeddings, fairness. With Colab labs."),
        m("Microsoft — Machine Learning for Beginners", "https://github.com/microsoft/ML-For-Beginners", CM, minutes=300, priority=7, type="course", notes="12-week classic ML curriculum with scikit-learn. Useful complement to StatQuest's theory."),
        m("scikit-learn — User Guide", "https://scikit-learn.org/stable/user_guide.html", CM, minutes=120, priority=8, type="reading", notes="The canonical Python ML toolbox. Skim sections 1, 2, 3, 5, 6, 9 — these are the patterns you'll re-use forever."),
        m("XGBoost — official tutorials", "https://xgboost.readthedocs.io/en/stable/tutorials/index.html", CM, minutes=90, priority=8, type="reading", notes="Gradient-boosted trees still beat NN on tabular data. Read 'Introduction to Boosted Trees' first."),
        m("LightGBM — features doc", "https://lightgbm.readthedocs.io/en/latest/Features.html", CM, minutes=45, priority=7, type="reading", notes="Faster than XGBoost via histogram-based binning + leaf-wise growth. Drop-in API."),
        m("CatBoost — official tutorial", "https://catboost.ai/en/docs/concepts/python-quickstart", CM, minutes=45, priority=6, type="reading", notes="Native categorical handling. Often wins Kaggle without much tuning."),
        m("Hands-On Machine Learning — Géron (book)", "https://github.com/ageron/handson-ml3", CM, minutes=900, priority=9, type="reading", cost=1.3, notes="Book + free notebooks. Ch 1-9 = classical ML, Ch 10-19 = deep learning. THE one ML book to own."),
    ]

    # Phase 1 — Fundamentals
    F = "LLM/ML · Phase 1 · Fundamentals"
    items += [
        m("Andrew Ng — ML Specialization Course 1 (supervised)", "https://www.coursera.org/learn/machine-learning", F, minutes=180, priority=9, type="course", notes="Linear/logistic regression, gradient descent, regularization. The canonical first course."),
        m("Andrew Ng — ML Specialization Course 2 (advanced)", "https://www.coursera.org/learn/advanced-learning-algorithms", F, minutes=180, priority=8, type="course", notes="Neural nets in TF, decision trees, XGBoost. Practical ML beyond linear."),
        m("Andrew Ng — ML Specialization Course 3 (unsupervised + RL)", "https://www.coursera.org/learn/unsupervised-learning-recommenders-reinforcement-learning", F, minutes=180, priority=7, type="course", notes="Clustering, anomaly detection, collaborative filtering, intro RL."),
        m("3B1B — Neural networks Ch 1: What is a neural network?", "https://www.youtube.com/watch?v=aircAruvnKk", F, minutes=20, priority=9, type="video", notes="Visual intuition for MLPs. Layers, weights, biases."),
        m("3B1B — Neural networks Ch 2: Gradient descent", "https://www.youtube.com/watch?v=IHZwWFHWa-w", F, minutes=20, priority=9, type="video", notes="How learning happens. Cost landscape."),
        m("3B1B — Neural networks Ch 3: Backpropagation calculus", "https://www.youtube.com/watch?v=tIeHLnjs5U8", F, minutes=15, priority=9, type="video", notes="The math of backprop. Watch alongside Karpathy's micrograd."),
        m("3B1B — Neural networks Ch 4: Backprop algorithm", "https://www.youtube.com/watch?v=Ilg3gGewQ5U", F, minutes=15, priority=8, type="video", notes="Algorithmic perspective."),
    ]

    # Phase 2 — Karpathy zero-to-hero
    K = "LLM/ML · Phase 2 · Karpathy Zero-to-Hero"
    items += [
        m("Karpathy — micrograd (autograd from scratch)", "https://www.youtube.com/watch?v=VMj-3S1tku0", K, minutes=150, priority=10, type="video", cost=1.4, notes="Build PyTorch's autograd engine in 100 LoC. After this, backprop will never confuse you again."),
        m("Karpathy — makemore Part 1: bigram model", "https://www.youtube.com/watch?v=PaCmpygFfXo", K, minutes=120, priority=9, type="video", notes="Character-level name generator. PyTorch basics, embeddings, NLL loss."),
        m("Karpathy — makemore Part 2: MLP (Bengio 2003)", "https://www.youtube.com/watch?v=TCH_1BHY58I", K, minutes=120, priority=9, type="video", notes="Implement Bengio's neural language model. Lookup tables, hidden layers."),
        m("Karpathy — makemore Part 3: activations, gradients, BN", "https://www.youtube.com/watch?v=P6sfmUTpUmc", K, minutes=120, priority=10, type="video", cost=1.3, notes="Diagnose dead neurons, saturating tanh, internal covariate shift. Batch norm explained."),
        m("Karpathy — makemore Part 4: backprop manually", "https://www.youtube.com/watch?v=q8SA3rM6ckI", K, minutes=120, priority=9, type="video", cost=1.4, notes="Reimplement backprop for cross-entropy + batch norm by hand. Brutal but illuminating."),
        m("Karpathy — makemore Part 5: WaveNet (causal convs)", "https://www.youtube.com/watch?v=t3YJ5hKiMQ0", K, minutes=120, priority=7, type="video"),
        m("Karpathy — Let's build GPT from scratch", "https://www.youtube.com/watch?v=kCc8FmEb1nY", K, minutes=180, priority=10, type="video", cost=1.5, notes="2h video. Build transformer + train on tinyshakespeare. THE most important video for understanding LLMs."),
        m("Karpathy — GPT-2 reproduction (124M)", "https://www.youtube.com/watch?v=l8pRSuU81PU", K, minutes=240, priority=8, type="video", cost=1.4, notes="4h video. Full GPT-2 reproduction. Distributed training, FlashAttention, mixed precision."),
        m("Karpathy — Tokenization deep dive", "https://www.youtube.com/watch?v=zduSFxRajkE", K, minutes=120, priority=8, type="video", notes="BPE from scratch. Why tokenization is the source of most LLM weirdness."),
        m("Karpathy — Intro to LLMs (1h talk)", "https://www.youtube.com/watch?v=zjkBMFhNj_g", K, minutes=60, priority=9, type="video", notes="Best high-level intro to how LLMs work. Watch first."),
        m("nanoGPT — train your own GPT-2", "https://github.com/karpathy/nanoGPT", K, minutes=180, priority=9, type="project", notes="Clone, train on Shakespeare, then OpenWebText. ~$10 of cloud GPU."),
    ]

    # Phase 2.5 — Practical DL frameworks (added from learn-ai-engineering)
    # After Karpathy's "from scratch", you need fluency in the actual frameworks.
    DLF = "LLM/ML · Phase 2.5 · DL Frameworks (PyTorch / Fast.ai)"
    items += [
        m("PyTorch — 60-Minute Blitz", "https://pytorch.org/tutorials/beginner/deep_learning_60min_blitz.html", DLF, minutes=90, priority=10, type="course", notes="Official quickstart: tensors, autograd, nn.Module, training loop, classifier. Do every cell."),
        m("PyTorch — Learn the Basics (full tutorial)", "https://pytorch.org/tutorials/beginner/basics/intro.html", DLF, minutes=180, priority=9, type="course", notes="Deeper than the blitz: datasets/dataloaders, transforms, save/load, TensorBoard. Set baseline fluency."),
        m("Fast.ai — Practical Deep Learning for Coders v5", "https://course.fast.ai/", DLF, minutes=900, priority=9, type="course", cost=1.2, notes="Top-down approach: build CNN classifiers + tabular + NLP before theory. Jeremy Howard. 9 lessons."),
        m("Andrew Ng — Deep Learning Specialization", "https://www.coursera.org/specializations/deep-learning", DLF, minutes=900, priority=8, type="course", cost=1.2, notes="5 courses: NN basics → hyperparameters → ML projects → CNN → sequence models. Slow but bulletproof foundation."),
    ]
    items += _statquest_nn_sessions(DLF)
    items += [
        m("Keras / TensorFlow — Sequential Model tutorial", "https://www.tensorflow.org/tutorials/keras/classification", DLF, minutes=60, priority=5, type="reading", notes="Optional: most ML jobs use PyTorch now, but Keras shows up in legacy/research codebases."),
    ]

    # Phase 3 — Transformers & LLMs
    T = "LLM/ML · Phase 3 · Transformers & LLMs"
    items += [
        m("\"Attention is All You Need\" (Vaswani et al.)", "https://arxiv.org/abs/1706.03762", T, minutes=90, priority=10, type="paper", cost=1.3, notes="The transformer paper. Read 3 times. Self-attention = O(n²) but parallel. Multi-head = multiple subspaces."),
        m("The Illustrated Transformer (Jay Alammar)", "https://jalammar.github.io/illustrated-transformer/", T, minutes=60, priority=10, type="reading", notes="Best visual companion to Attention is All You Need."),
        m("The Annotated Transformer (Harvard)", "http://nlp.seas.harvard.edu/2018/04/03/attention.html", T, minutes=120, priority=9, type="reading", cost=1.3, notes="Implement the paper line by line with the paper text inline. Gold."),
        m("GPT-1 paper (Radford 2018)", "https://cdn.openai.com/research-covers/language-unsupervised/language_understanding_paper.pdf", T, minutes=60, priority=8, type="paper", notes="Decoder-only transformer + unsupervised pretraining + supervised fine-tuning. Started everything."),
        m("GPT-2 paper (Radford 2019)", "https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf", T, minutes=60, priority=8, type="paper", notes="Zero-shot task transfer. 1.5B params."),
        m("GPT-3 paper (Brown et al. 2020)", "https://arxiv.org/abs/2005.14165", T, minutes=90, priority=9, type="paper", notes="In-context learning. 175B. Section 3 is the gold (eval suite)."),
        m("BERT paper (Devlin et al.)", "https://arxiv.org/abs/1810.04805", T, minutes=60, priority=7, type="paper", notes="Encoder-only, masked LM. Was dominant for NLU before decoder LLMs took over."),
        m("LLaMA paper (Touvron et al.)", "https://arxiv.org/abs/2302.13971", T, minutes=60, priority=8, type="paper", notes="Efficient open LLM. RMSNorm, SwiGLU, RoPE, GQA."),
        m("LLaMA 2 paper", "https://arxiv.org/abs/2307.09288", T, minutes=75, priority=8, type="paper", notes="RLHF details. Ghost attention. 70B SOTA at time."),
        m("Mistral 7B paper", "https://arxiv.org/abs/2310.06825", T, minutes=45, priority=7, type="paper", notes="Sliding window attention, grouped query attention. Punching above weight."),
        m("Hugging Face — LLM course", "https://huggingface.co/learn/llm-course", T, minutes=240, priority=9, type="course", notes="Free, hands-on. Tokenizers → Transformers → Datasets → Fine-tuning."),
        m("Lilian Weng — The Transformer Family (v2)", "https://lilianweng.github.io/posts/2023-01-27-the-transformer-family-v2/", T, minutes=90, priority=8, type="reading", notes="Encyclopedia of transformer variants. Reference."),
    ]

    # Phase 4 — Alignment, RAG, agents
    A = "LLM/ML · Phase 4 · Alignment & RAG"
    items += [
        m("InstructGPT paper (Ouyang et al.)", "https://arxiv.org/abs/2203.02155", A, minutes=90, priority=10, type="paper", notes="SFT → RM training → PPO. The recipe that made ChatGPT work."),
        m("RLHF — Hugging Face deep dive", "https://huggingface.co/blog/rlhf", A, minutes=60, priority=9, type="reading", notes="Practical implementation walk-through. Use TRL library."),
        m("DPO paper (Rafailov et al.)", "https://arxiv.org/abs/2305.18290", A, minutes=75, priority=9, type="paper", notes="Direct Preference Optimization. Skips reward model, optimizes preferences directly. Simpler than PPO."),
        m("Constitutional AI (Anthropic)", "https://arxiv.org/abs/2212.08073", A, minutes=75, priority=7, type="paper", notes="Self-supervised alignment via principles. Used by Claude."),
        m("LoRA paper", "https://arxiv.org/abs/2106.09685", A, minutes=45, priority=9, type="paper", notes="Low-rank adapters: train tiny matrices that perturb frozen weights. The standard for fine-tuning."),
        m("QLoRA paper", "https://arxiv.org/abs/2305.14314", A, minutes=45, priority=8, type="paper", notes="4-bit quantization + LoRA. Fine-tune 65B on a single GPU."),
        m("PEFT library — hands-on", "https://huggingface.co/docs/peft/index", A, minutes=60, priority=8, type="reading", notes="Apply LoRA/QLoRA/IA³ to any HF model in 5 lines."),
        m("RAG — Lewis et al.", "https://arxiv.org/abs/2005.11401", A, minutes=60, priority=9, type="paper", notes="Original retrieval-augmented generation paper. Retriever + generator joint training."),
        m("ReAct paper (Yao et al.)", "https://arxiv.org/abs/2210.03629", A, minutes=45, priority=9, type="paper", notes="Reason + Act = interleaved thought and action. Foundation of modern agents."),
        m("Chain-of-Thought paper", "https://arxiv.org/abs/2201.11903", A, minutes=45, priority=8, type="paper", notes="\"Let's think step by step.\" Emergent at scale (>60B)."),
        m("Tree of Thoughts", "https://arxiv.org/abs/2305.10601", A, minutes=45, priority=7, type="paper", notes="Search over CoT branches. BFS/DFS with self-eval."),
        m("Toolformer", "https://arxiv.org/abs/2302.04761", A, minutes=45, priority=7, type="paper", notes="Self-supervised tool learning. Pre-cursor to function calling."),
        m("LangChain docs (intro)", "https://python.langchain.com/docs/introduction/", A, minutes=90, priority=7, type="reading", notes="Practical orchestration. Note: API churns; build your own loops once you grok it."),
        m("LlamaIndex docs", "https://docs.llamaindex.ai/", A, minutes=90, priority=7, type="reading", notes="Better than LangChain for RAG-focused pipelines. Indexes + query engines."),
        m("Build a RAG system from scratch", "https://www.pinecone.io/learn/series/rag/", A, minutes=180, priority=10, type="project", cost=1.3, notes="Capstone: ingest your own corpus → chunk → embed → retrieve → generate → eval. End-to-end ownership."),
        m("vLLM — production LLM serving", "https://docs.vllm.ai/", A, minutes=60, priority=7, type="reading", notes="PagedAttention. Continuous batching. The standard for OSS LLM serving."),
        m("Lilian Weng — LLM Powered Autonomous Agents", "https://lilianweng.github.io/posts/2023-06-23-agent/", A, minutes=90, priority=9, type="reading", notes="Comprehensive overview of agent architectures. Read before building."),
    ]

    # Phase 4.5 — DL Specializations (added from learn-ai-engineering)
    # CV / NLP / RL — pick by interest, but at least skim each.
    SPEC = "LLM/ML · Phase 4.5 · Specializations (CV / NLP / RL)"
    items += [
        m("Stanford CS231n — Deep Learning for Computer Vision", "http://cs231n.stanford.edu/", SPEC, minutes=900, priority=8, type="course", cost=1.3, notes="The CV course. Lecture videos + assignments. CNNs → object detection → segmentation → generative."),
        m("Stanford CS224n — NLP with Deep Learning", "https://web.stanford.edu/class/cs224n/", SPEC, minutes=900, priority=8, type="course", cost=1.3, notes="The NLP course. Word vectors → RNN → seq2seq → attention → transformers. Watch alongside Karpathy."),
        m("Hugging Face — NLP Course", "https://huggingface.co/learn/nlp-course", SPEC, minutes=300, priority=8, type="course", notes="Hands-on NLP with Transformers + Datasets + Tokenizers libraries. Free, practical, fast."),
        m("Hugging Face — Deep RL Course", "https://huggingface.co/learn/deep-rl-course", SPEC, minutes=600, priority=7, type="course", cost=1.2, notes="Q-learning → DQN → policy gradients → PPO → multi-agent. Hands-on with stable-baselines3 and ML-Agents."),
        m("Berkeley CS285 — Deep Reinforcement Learning", "https://rail.eecs.berkeley.edu/deeprlcourse/", SPEC, minutes=900, priority=6, type="course", cost=1.4, notes="The rigorous DRL course. Sergey Levine. Pair with Sutton & Barto. Optional unless you want RL depth."),
        m("Spinning Up in Deep RL — OpenAI", "https://spinningup.openai.com/en/latest/", SPEC, minutes=240, priority=6, type="reading", notes="Best practical entry point to DRL: VPG → TRPO → PPO → DDPG → SAC. Clean code + intuitive write-ups."),
    ]

    # Phase 4.6 — Generative AI beyond LLMs (added)
    GEN = "LLM/ML · Phase 4.6 · Generative AI (Diffusion + GANs)"
    items += [
        m("GANs — Goodfellow et al. (2014)", "https://arxiv.org/abs/1406.2661", GEN, minutes=60, priority=8, type="paper", notes="The original adversarial generator paper. Foundation for everything pre-diffusion."),
        m("DDPM — Denoising Diffusion Probabilistic Models (Ho et al.)", "https://arxiv.org/abs/2006.11239", GEN, minutes=75, priority=9, type="paper", cost=1.3, notes="The diffusion model paper that made Stable Diffusion possible. Read with Lilian Weng's blog open."),
        m("Lilian Weng — What are Diffusion Models?", "https://lilianweng.github.io/posts/2021-07-11-diffusion-models/", GEN, minutes=60, priority=9, type="reading", notes="The clearest written explanation of DDPM. Math + intuition."),
        m("Stable Diffusion — Latent Diffusion paper", "https://arxiv.org/abs/2112.10752", GEN, minutes=60, priority=8, type="paper", notes="Run diffusion in latent space (VAE-compressed) → 10× speedup → SD becomes feasible on consumer GPUs."),
        m("Microsoft — Generative AI for Beginners", "https://microsoft.github.io/generative-ai-for-beginners/", GEN, minutes=300, priority=7, type="course", notes="21-lesson tour: prompting, RAG, embeddings, fine-tuning, agents. Light but broad."),
        m("Lilian Weng — A Visual Guide to LLM Agents", "https://lilianweng.github.io/posts/2023-06-23-agent/", GEN, minutes=45, priority=7, type="reading", notes="(Reprise — also in Phase 4.) Reference when building agentic systems."),
    ]

    # Phase 4.7 — Visual Guides & Reasoning (modern landscape)
    VG = "LLM/ML · Phase 4.7 · Modern Landscape (MoE / Reasoning / Multimodal)"
    items += [
        m("A Visual Guide to Mixture of Experts (MoE)", "https://newsletter.maartengrootendorst.com/p/a-visual-guide-to-mixture-of-experts", VG, minutes=45, priority=8, type="reading", notes="MoE: route tokens to a subset of experts. Used by Mixtral, GPT-4, DeepSeek-V3. Visual + clear."),
        m("Understanding Reasoning LLMs — Sebastian Raschka", "https://magazine.sebastianraschka.com/p/understanding-reasoning-llms", VG, minutes=45, priority=9, type="reading", notes="What changed in o1, R1, and reasoning models. Test-time compute, CoT distillation, RL on reasoning traces."),
        m("A Visual Guide to Reasoning LLMs", "https://newsletter.maartengrootendorst.com/p/a-visual-guide-to-reasoning-llms", VG, minutes=45, priority=8, type="reading", notes="Visual companion to Raschka's piece. Shows the inference-time scaling curves."),
        m("Understanding Multimodal LLMs — Sebastian Raschka", "https://magazine.sebastianraschka.com/p/understanding-multimodal-llms", VG, minutes=45, priority=7, type="reading", notes="How vision encoders attach to LLMs (CLIP, Flamingo, LLaVA, GPT-4V). Cross-attention vs early fusion."),
        m("The Illustrated GPT-2 — Jay Alammar", "https://jalammar.github.io/illustrated-gpt2/", VG, minutes=45, priority=7, type="reading", notes="Visual GPT-2 walkthrough. Read after the original Illustrated Transformer."),
        m("Understanding Large Language Models — Raschka", "https://magazine.sebastianraschka.com/p/understanding-large-language-models", VG, minutes=45, priority=7, type="reading", notes="Concise survey of LLM architectures + training. Good single-page reference."),
        m("Hugging Face — LLM Course (modules 6-9 advanced)", "https://huggingface.co/learn/llm-course", VG, minutes=240, priority=7, type="course", notes="(Reprise — see Phase 3.) Continue with advanced modules: long-context, multilingual, code, alignment."),
    ]

    # Phase 4.8 — Advanced RAG Techniques (added)
    AR = "LLM/ML · Phase 4.8 · Advanced RAG Techniques"
    items += [
        m("RAG Techniques — NirDiamant (GitHub)", "https://github.com/NirDiamant/RAG_Techniques", AR, minutes=300, priority=10, type="reading", cost=1.3, notes="Best catalog of advanced RAG patterns with code. Bookmark + work through 5-10 of them after you own a basic RAG."),
        m("Precise Zero-Shot Dense Retrieval — HyDE", "https://arxiv.org/abs/2212.10496", AR, minutes=45, priority=8, type="paper", notes="Generate a hypothetical answer with LLM → embed it → retrieve. Often beats direct query embedding."),
        m("ColBERT — late-interaction retrieval", "https://arxiv.org/abs/2004.12832", AR, minutes=45, priority=7, type="paper", notes="Per-token embeddings + max-sim. Much better recall than single-vector for long passages."),
        m("Self-RAG — Asai et al.", "https://arxiv.org/abs/2310.11511", AR, minutes=60, priority=8, type="paper", notes="LLM emits special tokens to decide when/what to retrieve and whether to critique its own outputs."),
        m("Re-ranking with cross-encoders", "https://www.sbert.net/examples/applications/retrieve_rerank/README.html", AR, minutes=45, priority=8, type="reading", notes="Two-stage: dense recall → cross-encoder rerank top-50. Huge accuracy boost for retrieval."),
        m("Anthropic — Contextual Retrieval", "https://www.anthropic.com/news/contextual-retrieval", AR, minutes=30, priority=9, type="reading", notes="Prepend chunk-specific context via LLM before embedding. ~49% reduction in failed retrievals."),
        m("Awesome LLM Apps — RAG examples", "https://github.com/Shubhamsaboo/awesome-llm-apps", AR, minutes=120, priority=7, type="reading", notes="Catalog of end-to-end RAG apps with code. Inspiration + working starter kits."),
        m("Evaluating RAG with RAGAS", "https://docs.ragas.io/", AR, minutes=45, priority=8, type="reading", notes="Faithfulness, answer relevance, context precision/recall — without ground truth labels. Critical for iteration."),
    ]

    # Phase 4.9 — Advanced AI Agents + MCP (added)
    AG2 = "LLM/ML · Phase 4.9 · Advanced Agents & MCP"
    items += [
        m("Hugging Face — AI Agents Course", "https://huggingface.co/learn/agents-course", AG2, minutes=600, priority=10, type="course", cost=1.2, notes="Free, hands-on. Build agents from scratch → smolagents → LangGraph. Best comprehensive agents course right now."),
        m("Chip Huyen — Agents", "https://huyenchip.com/2025/01/07/agents.html", AG2, minutes=60, priority=10, type="reading", notes="The clearest definition of an agent in 2025. Tool use → planning → reflection. Read twice."),
        m("Building AI Browser Agents — DeepLearning.AI", "https://www.deeplearning.ai/short-courses/building-ai-browser-agents/", AG2, minutes=90, priority=8, type="course", notes="Multi-step browser automation with computer use. Real-world action-taking agents."),
        m("Anthropic — Model Context Protocol guide", "https://modelcontextprotocol.io/introduction", AG2, minutes=60, priority=10, type="reading", notes="Open standard for connecting LLMs to tools/data. Becoming the agent integration layer."),
        m("Hugging Face — MCP Course", "https://huggingface.co/learn/mcp-course", AG2, minutes=300, priority=9, type="course", notes="Build MCP servers + clients. Connect Claude/Cursor/your-agent to your own tools."),
        m("Awesome MCP Servers", "https://github.com/punkpeye/awesome-mcp-servers", AG2, minutes=60, priority=6, type="reading", notes="Catalog of community MCP servers (filesystem, GitHub, Slack, Postgres, …). Steal patterns for your own."),
        m("AI Agents in Action (Manning)", "https://www.manning.com/books/ai-agents-in-action", AG2, minutes=720, priority=6, type="reading", cost=1.3, notes="Book — end-to-end agent systems: memory, planning, tools, multi-agent. Optional long-form."),
        m("Build a Multi-Agent System from Scratch (Manning)", "https://www.manning.com/books/build-a-multi-agent-system-from-scratch", AG2, minutes=600, priority=6, type="reading", cost=1.3, notes="Companion book — orchestration, coordination, shared state. Optional."),
    ]

    # Phase 5 — Production, Evals & MLOps
    P5 = "LLM/ML · Phase 5 · Production, Evals & MLOps"
    items += [
        m("LLM eval frameworks — overview", "https://eugeneyan.com/writing/llm-patterns/", P5, minutes=90, priority=8, type="reading", notes="Eugene Yan's catalog of patterns. Pragmatic, battle-tested."),
        m("Prompt engineering guide", "https://www.promptingguide.ai/", P5, minutes=60, priority=7, type="reading", notes="Catalog of techniques: few-shot, CoT, ReAct, self-consistency, ToT."),
        m("Anthropic — Building effective agents", "https://www.anthropic.com/research/building-effective-agents", P5, minutes=30, priority=9, type="reading", notes="Workflows vs agents. When to use which. Patterns: chain, route, parallelize, orchestrator-workers."),
        m("Anthropic — Tool use docs", "https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/overview", P5, minutes=45, priority=8, type="reading", notes="JSON schema-defined tools. Multi-turn tool use. Parallel tool execution."),
        m("OpenAI cookbook — function calling", "https://cookbook.openai.com/examples/how_to_call_functions_with_chat_models", P5, minutes=30, priority=7, type="reading", notes="Same idea, OpenAI API. Convergent design across providers."),
        m("Andrew Ng — Machine Learning in Production (DeepLearning.AI)", "https://www.coursera.org/specializations/machine-learning-engineering-for-production-mlops", P5, minutes=900, priority=9, type="course", cost=1.2, notes="4-course MLOps spec: project scoping → data → modeling → deployment. THE practical MLOps course."),
        m("Full Stack Deep Learning", "https://fullstackdeeplearning.com/course/", P5, minutes=600, priority=9, type="course", cost=1.2, notes="Pragmatic course on shipping ML systems. Data labeling, experiment tracking, deployment, monitoring."),
        m("Stanford CS329S — ML Systems Design", "https://stanford-cs329s.github.io/syllabus.html", P5, minutes=600, priority=8, type="course", cost=1.3, notes="Chip Huyen's course. ML system design at scale. Pair with her 'Designing ML Systems' book."),
        m("MLflow — official tutorials", "https://mlflow.org/docs/latest/index.html", P5, minutes=90, priority=7, type="reading", notes="Experiment tracking + model registry + serving. Lightweight, open, ubiquitous."),
        m("Streamlit — get started", "https://docs.streamlit.io/get-started", P5, minutes=45, priority=6, type="reading", notes="Fastest way to put a UI on a model demo. Useful for prototypes + internal tools."),
        m("vLLM — production LLM serving", "https://docs.vllm.ai/", P5, minutes=60, priority=8, type="reading", notes="(Reprise.) PagedAttention + continuous batching. The OSS serving standard."),
        m("Designing ML Systems — Chip Huyen (book)", "https://www.oreilly.com/library/view/designing-machine-learning/9781098107956/", P5, minutes=900, priority=9, type="reading", cost=1.3, notes="System design for ML in industry. Data, training, serving, monitoring, organization."),
        m("AI Engineering — Chip Huyen (book, 2024)", "https://www.oreilly.com/library/view/ai-engineering/9781098166298/", P5, minutes=900, priority=10, type="reading", cost=1.3, notes="The LLM-era successor. Foundation models, evaluation, RAG, fine-tuning, agents, production patterns. Current."),
    ]

    # Phase 6 — Long-form books (canonical references; not weekly reading)
    BK = "LLM/ML · Phase 6 · Canonical Books"
    items += [
        m("Build a Large Language Model From Scratch — Sebastian Raschka", "https://www.manning.com/books/build-a-large-language-model-from-scratch", BK, minutes=900, priority=10, type="reading", cost=1.3, notes="The book version of Karpathy's videos with extra rigor: data → tokenizer → architecture → pretraining → fine-tuning → RLHF. Capstone build."),
        m("Deep Learning — Goodfellow, Bengio, Courville", "https://www.deeplearningbook.org/", BK, minutes=1800, priority=7, type="reading", cost=1.4, notes="The reference. Math-heavy. Use as a lookup, not linear read. Part II ch 6-9 = MLP/CNN/RNN. Part III = research."),
        m("Deep Learning with Python — Chollet (2nd ed)", "https://www.manning.com/books/deep-learning-with-python-second-edition", BK, minutes=720, priority=6, type="reading", cost=1.2, notes="Keras-focused. Useful for the conceptual chapters; skip if you're staying in PyTorch."),
        m("Natural Language Processing with Transformers (HF book)", "https://www.oreilly.com/library/view/natural-language-processing/9781098136789/", BK, minutes=720, priority=7, type="reading", cost=1.2, notes="HF team's book. Hands-on: classification, NER, QA, summarization, generation with HF Transformers."),
        m("Why Machines Learn — Anil Ananthaswamy", "https://www.penguinrandomhouse.com/books/676441/why-machines-learn-by-anil-ananthaswamy/", BK, minutes=720, priority=5, type="reading", notes="Optional: lay-mathematical narrative of how ML evolved. Good for context, not skills."),
        m("LLMs in Production — Manning", "https://www.manning.com/books/llms-in-production", BK, minutes=720, priority=7, type="reading", cost=1.2, notes="Production-focused: latency, observability, prompt versioning, cost. Complements Chip Huyen's AI Engineering."),
        m("Prompt Engineering for LLMs — Berryman & Ziegler (O'Reilly)", "https://www.oreilly.com/library/view/prompt-engineering-for/9781098156145/", BK, minutes=480, priority=6, type="reading", notes="Beyond catalog: structured techniques for production prompts. Useful for agent system design."),
        m("Reference list — Must-Read AI Papers (curated)", "https://github.com/ashishps1/learn-ai-engineering", BK, minutes=30, priority=6, type="reading", notes="Source list for many materials here. Bookmark for new additions."),
    ]

    LLM_TRACK["materials"] = items


# ============================================================================
# System Design — Donne Martin + ByteByteGo + LLD patterns
# ============================================================================

SD_TRACK = {
    "slug": "system-design",
    "name": "System Design",
    "description": "LLD patterns → distributed building blocks → HLD case studies → GenAI infrastructure. From parking-lot to vLLM serving.",
    "color": "#0ea5e9",
    "cognitive_multiplier": 1.2,
    "is_system": False,
    "materials": [],
}


def add_sd():
    items: list[dict[str, Any]] = []

    # Phase 0 — Foundational video courses (in this order for max signal)
    VID = "System Design · Phase 0 · Video Course"
    items += [
        m("Hello Interview — System Design in a Hurry (playlist)", "https://www.youtube.com/@hello_interview/playlists", VID, minutes=20, priority=10, type="video", notes="Start here. Modern, sharp overview of how large systems are designed. Watch the full playlist."),
        m("Hello Interview — Core Concepts: Scaling, Sharding, CAP", "https://www.youtube.com/watch?v=ZgdS0EUmn70", VID, minutes=45, priority=10, type="video", notes="Foundational vocabulary for distributed systems — scaling, sharding, CAP tradeoffs."),
        m("Hello Interview — Key Technologies (DBs, Caches, Queues)", "https://www.youtube.com/watch?v=Vyc8lezaa9k", VID, minutes=60, priority=10, type="video", notes="The toolbox you compose systems from. Postgres vs Dynamo vs Cassandra; Redis vs Memcached; Kafka vs SQS."),
        m("Hello Interview — Common Patterns (Read/Write Heavy, Geo)", "https://www.youtube.com/watch?v=cKbmDIeAVj8", VID, minutes=45, priority=9, type="video", notes="Pattern recognition — most real systems map to a handful of archetypes."),
        m("Hello Interview — Delivery Framework", "https://www.youtube.com/watch?v=iYIjJ7utdDI", VID, minutes=45, priority=10, type="video", notes="Requirements → API → data model → high level → deep dives. A reusable structure for thinking through any system."),
        m("Hello Interview — Design TicketMaster", "https://www.youtube.com/watch?v=fhdPyoO6aXI", VID, minutes=60, priority=9, type="video", notes="High-contention seat reservation. Optimistic vs pessimistic locking. Redis distributed locks."),
        m("Hello Interview — Design Uber", "https://www.youtube.com/watch?v=lsKU38RKQSo", VID, minutes=75, priority=10, type="video", notes="Geo-spatial indexing (S2/H3/Quadtree). Driver location streams. Matching algorithm."),
        m("Hello Interview — Design Top K (Leaderboard)", "https://www.youtube.com/watch?v=4abuO0wGcF8", VID, minutes=45, priority=8, type="video", notes="Count-min sketch + heap. Approximate algorithms for scale."),
        m("Hello Interview — Design Yelp / Proximity Service", "https://www.youtube.com/watch?v=M4lR_Va97cQ", VID, minutes=60, priority=8, type="video", notes="Geohash. Quadtree vs S2 vs H3 tradeoffs."),
        m("Hello Interview — Design WhatsApp", "https://www.youtube.com/watch?v=qfM8dHEzr_g", VID, minutes=60, priority=9, type="video", notes="Persistent WebSocket. Message delivery semantics. E2E encryption."),
        m("Hello Interview — Design FB Live Comments", "https://www.youtube.com/watch?v=I3Ts_3Pu_BE", VID, minutes=45, priority=7, type="video", notes="SSE vs WebSocket vs long-poll. Fanout strategies."),
        m("Hello Interview — Design Dropbox", "https://www.youtube.com/watch?v=jLM1nGgsT-I", VID, minutes=60, priority=8, type="video", notes="Block storage. Chunking + delta sync. Conflict resolution."),
        m("Hello Interview — Design Web Crawler", "https://www.youtube.com/watch?v=tVK6lqUkPyQ", VID, minutes=45, priority=7, type="video", notes="URL frontier. Politeness + duplicate URL detection. Bloom filters."),

        m("ByteByteGo — System Design 101 (playlist)", "https://www.youtube.com/@ByteByteGo/playlists", VID, minutes=15, priority=9, type="video", notes="Alex Xu's animated explanations. Watch the System Design 101 playlist start-to-finish."),
        m("ByteByteGo — Top 5 Most Used Architecture Patterns", "https://www.youtube.com/watch?v=ZA1lzwGTrtg", VID, minutes=10, priority=8, type="video", notes="Layered, Event-Driven, Microservices, Microkernel, Space-Based."),
        m("ByteByteGo — How does Redis really work?", "https://www.youtube.com/watch?v=fmT5nlEkl3U", VID, minutes=10, priority=8, type="video"),
        m("ByteByteGo — Database Indexing Explained", "https://www.youtube.com/watch?v=YuRO9-rOgv4", VID, minutes=10, priority=9, type="video", notes="B-tree vs hash index. Composite indexes. When indexes hurt."),
        m("ByteByteGo — Top 8 Database Sharding Strategies", "https://www.youtube.com/watch?v=hdxdhCpgYo8", VID, minutes=10, priority=8, type="video"),
        m("ByteByteGo — How OAuth 2.0 Works", "https://www.youtube.com/watch?v=ZV5yTm4pT8g", VID, minutes=10, priority=7, type="video"),
        m("ByteByteGo — Top 6 Load Balancing Algorithms", "https://www.youtube.com/watch?v=dBmxNsS3BGE", VID, minutes=10, priority=8, type="video"),
        m("ByteByteGo — Pub/Sub vs Message Queue", "https://www.youtube.com/watch?v=O1PgqUqZKTA", VID, minutes=10, priority=8, type="video"),

        m("Gaurav Sen — Consistent Hashing", "https://www.youtube.com/watch?v=zaRkONvyGr8", VID, minutes=15, priority=10, type="video", notes="The canonical 15min explanation. Watch twice."),
        m("Gaurav Sen — Distributed Cache Design", "https://www.youtube.com/watch?v=iuqZvajTOyA", VID, minutes=25, priority=9, type="video"),
        m("Gaurav Sen — Distributed Counter", "https://www.youtube.com/watch?v=brWyKbyHrgs", VID, minutes=25, priority=7, type="video", notes="CRDTs, eventual consistency."),
        m("Gaurav Sen — Design Twitter", "https://www.youtube.com/watch?v=wYk0xPP_P_8", VID, minutes=30, priority=9, type="video"),
        m("Gaurav Sen — Design WhatsApp", "https://www.youtube.com/watch?v=L7LtmfFYjc4", VID, minutes=30, priority=8, type="video"),
        m("Gaurav Sen — Design Tinder", "https://www.youtube.com/watch?v=tndzLznxq40", VID, minutes=25, priority=7, type="video"),
        m("Gaurav Sen — Notification Service Design", "https://www.youtube.com/watch?v=mNHzgxFmaiE", VID, minutes=25, priority=7, type="video"),

        m("Jordan — Designing Slack", "https://www.youtube.com/watch?v=Ye85QO4LbVE", VID, minutes=45, priority=8, type="video"),
        m("Jordan — Designing Netflix", "https://www.youtube.com/watch?v=tWjcD8H4G6I", VID, minutes=45, priority=8, type="video"),
        m("Jordan — Designing Yelp", "https://www.youtube.com/watch?v=jzUjJa15Wp8", VID, minutes=45, priority=7, type="video"),
        m("Jordan — Designing TikTok", "https://www.youtube.com/watch?v=07kFsiNu6Z4", VID, minutes=45, priority=7, type="video"),
        m("Jordan — Designing Amazon", "https://www.youtube.com/watch?v=oNg34cRFV6E", VID, minutes=45, priority=8, type="video"),

        m("Designing Data-Intensive Applications (book)", "https://dataintensive.net/", VID, minutes=60, priority=10, type="reading", cost=1.5, notes="Martin Kleppmann. THE textbook. Schedule 1 chapter per week alongside videos. Non-negotiable."),
    ]
    items += _gaurav_sen_sessions(VID)
    items += _jordan_sdi_sessions(VID)
    items += _mit_6824_sessions(VID)

    LLD = "System Design · Phase 1 · LLD"
    items += [
        m("SOLID principles", "https://en.wikipedia.org/wiki/SOLID", LLD, minutes=45, priority=9, type="reading", notes="SRP, OCP, LSP, ISP, DIP. Every code review should reference these."),
        m("Refactoring Guru — Design patterns (all 23)", "https://refactoring.guru/design-patterns/catalog", LLD, minutes=240, priority=9, type="reading", cost=1.2, notes="Read all. Memorize: Strategy, Observer, Factory, Singleton, Decorator, Adapter, Command. Use cards for the rest."),
        m("LLD — Parking Lot", "https://github.com/kamranahmedse/design-patterns-for-humans", LLD, minutes=90, priority=8, type="project", notes="Vehicles, slots, tickets, payment. Class diagram + Python impl. Classic warmup."),
        m("LLD — Splitwise", "https://leetcode.com/discuss/interview-question/object-oriented-design/124638/splitwise", LLD, minutes=90, priority=8, type="project", notes="Users, groups, expenses, balances. Observer pattern for notifications."),
        m("LLD — Elevator", "https://leetcode.com/discuss/interview-question/object-oriented-design/410585/elevator-system", LLD, minutes=90, priority=7, type="project", notes="State machine. SCAN/LOOK scheduling. Multiple elevator coordination."),
        m("LLD — Vending Machine (State pattern)", "https://refactoring.guru/design-patterns/state/python/example", LLD, minutes=60, priority=7, type="project", notes="States: idle, has-money, dispensing. Transitions. Strategy pattern alternative."),
        m("LLD — Snake & Ladder", "https://leetcode.com/discuss/interview-question/object-oriented-design/799678/Snakes-and-Ladders-Object-Oriented-Design", LLD, minutes=60, priority=6, type="project"),
        m("LLD — Cab booking (Uber)", "https://leetcode.com/discuss/interview-question/object-oriented-design/1308113/uber-low-level-design-with-explained-code", LLD, minutes=90, priority=8, type="project", notes="Strategy for fare. Observer for notifications. State for ride lifecycle."),
    ]

    BB = "System Design · Phase 2 · Building Blocks"
    items += [
        m("System Design Primer (Donne Martin)", "https://github.com/donnemartin/system-design-primer", BB, minutes=480, priority=10, type="reading", cost=1.3, notes="THE single best free system design resource. Read sections in order. ~8h total. Internalize."),
        m("Load balancers — L4 vs L7", "https://www.cloudflare.com/learning/performance/types-of-load-balancing-algorithms/", BB, minutes=30, priority=8, type="reading", notes="Round robin, least conn, IP hash, consistent hash. L4 (TCP) vs L7 (HTTP) tradeoffs."),
        m("CAP theorem & PACELC", "https://www.youtube.com/watch?v=BHqjEjzAicA", BB, minutes=20, priority=9, type="video", notes="In partition: Consistency or Availability. PACELC adds: else, Latency or Consistency. Know examples (DynamoDB AP, Spanner CP)."),
        m("SQL vs NoSQL — when to use which", "https://www.youtube.com/watch?v=ZS_kXvOeQ5Y", BB, minutes=30, priority=8, type="video", notes="Relational for joins + ACID. KV/Document/Column for scale + flexible schema. Hybrid is the norm."),
        m("Database sharding strategies", "https://www.mongodb.com/features/database-sharding-explained", BB, minutes=30, priority=8, type="reading", notes="Range, hash, geo. Hotspots, resharding, distributed transactions are the pain."),
        m("Database replication — leader-follower, multi-leader", "https://www.youtube.com/watch?v=bI8Ry6GhMSE", BB, minutes=30, priority=8, type="video", notes="Sync vs async replication. Lag. Failover. Quorum reads."),
        m("Consistency models", "https://jepsen.io/consistency", BB, minutes=45, priority=9, type="reading", cost=1.3, notes="Strong, sequential, causal, eventual. Jepsen's diagram is gospel."),
        m("Caching patterns", "https://aws.amazon.com/builders-library/caching-challenges-and-strategies/", BB, minutes=45, priority=9, type="reading", notes="Cache-aside, read-through, write-through, write-back, refresh-ahead. Invalidation. Stampede."),
        m("Redis use cases & data structures", "https://redis.io/docs/latest/develop/", BB, minutes=60, priority=8, type="reading", notes="Strings, lists, sets, sorted sets, hashes, streams. Pub/sub. Use cases: cache, rate limit, leaderboard, queue."),
        m("Message queues — Kafka vs RabbitMQ vs SQS", "https://www.youtube.com/watch?v=cYwy-3ovUlc", BB, minutes=45, priority=8, type="video", notes="Kafka: durable log, replay, high throughput. RabbitMQ: routing, complex topology. SQS: managed simple."),
        m("Kafka deep dive — partitions, consumer groups", "https://www.confluent.io/learn/kafka-tutorial/", BB, minutes=90, priority=7, type="reading", notes="Topics → partitions → offsets. Consumer groups for parallel + at-least-once. Exactly-once semantics."),
        m("Consistent hashing", "https://www.toptal.com/big-data/consistent-hashing", BB, minutes=45, priority=8, type="reading", notes="Ring, virtual nodes. Minimal reshuffling on node add/remove. Used in DynamoDB, Cassandra, CDNs."),
        m("Rate limiting algorithms", "https://blog.bytebytego.com/p/rate-limiter-fundamentals", BB, minutes=30, priority=7, type="reading", notes="Token bucket, leaky bucket, fixed window, sliding window log, sliding window counter."),
        m("REST vs gRPC vs GraphQL", "https://www.youtube.com/watch?v=l_P6m3JTyp0", BB, minutes=30, priority=7, type="video", notes="REST: simple, ubiquitous. gRPC: binary, streaming, internal. GraphQL: client-shaped queries, federation."),
    ]

    HLD = "System Design · Phase 3 · HLD Case Studies"
    items += [
        m("HLD — TinyURL / URL shortener", "https://www.youtube.com/watch?v=JQDHz72OA3c", HLD, minutes=60, priority=9, type="video", notes="Hash vs counter for ID. Base62 encoding. Read-heavy: cache. Custom URLs."),
        m("HLD — Pastebin", "https://github.com/donnemartin/system-design-primer/blob/master/solutions/system_design/pastebin/README.md", HLD, minutes=60, priority=7, type="reading", notes="Object storage for content. Metadata in DB. Expiration job."),
        m("HLD — Twitter feed", "https://www.youtube.com/watch?v=wYk0xPP_P_8", HLD, minutes=75, priority=10, type="video", cost=1.3, notes="Fanout-on-write vs fanout-on-read. Hybrid for celebrities. Timeline cache."),
        m("HLD — Instagram", "https://www.youtube.com/watch?v=QmX2NPkJTKg", HLD, minutes=60, priority=8, type="video", notes="Photo storage (CDN), metadata, feed, search. Encoding pipeline."),
        m("HLD — Netflix / video streaming", "https://www.youtube.com/watch?v=lYoSd2WCJTo", HLD, minutes=75, priority=9, type="video", notes="Transcoding pipeline. ABR (adaptive bitrate). CDN edge caches. Recommendation."),
        m("HLD — WhatsApp / chat", "https://www.youtube.com/watch?v=L7LtmfFYjc4", HLD, minutes=60, priority=8, type="video", notes="WebSocket persistent connection. Message broker. Delivery + read receipts. E2E encryption."),
        m("HLD — Uber / ride dispatch", "https://www.youtube.com/watch?v=lsKU38RKQSo", HLD, minutes=75, priority=9, type="video", cost=1.3, notes="Geo sharding (S2/H3). Driver location streams. Matching algorithm. Surge pricing."),
        m("HLD — Dropbox / cloud storage", "https://www.youtube.com/watch?v=U0xTu6E2CT8", HLD, minutes=60, priority=7, type="video", notes="Block-level dedup. Delta sync. Conflict resolution."),
        m("HLD — Distributed cache (memcached/Redis cluster)", "https://www.youtube.com/watch?v=iuqZvajTOyA", HLD, minutes=60, priority=8, type="video", notes="Consistent hashing. Replication for fault tolerance. Cache stampede prevention."),
        m("HLD — Rate limiter (distributed)", "https://www.youtube.com/watch?v=FU4WlwfS3G0", HLD, minutes=45, priority=8, type="video", notes="Redis Lua scripts for atomicity. Token bucket per user. Sliding window for accuracy."),
        m("HLD — Notification system", "https://www.youtube.com/watch?v=mNHzgxFmaiE", HLD, minutes=45, priority=7, type="video", notes="Provider abstraction (push, email, SMS). Templates. Retry + dedup. User preferences."),
        m("HLD — Search autocomplete", "https://www.youtube.com/watch?v=us0qySiUsGU", HLD, minutes=45, priority=7, type="video", notes="Trie + top-k per prefix. Update pipeline. Distribute by prefix sharding."),
        m("HLD — Web crawler", "https://www.youtube.com/watch?v=BKZxZwUgL3Y", HLD, minutes=60, priority=6, type="video", notes="URL frontier (BFS with politeness). Dedup via bloom filters. Content extraction."),
        m("HLD — YouTube", "https://www.youtube.com/watch?v=jPKTo1iGQiE", HLD, minutes=75, priority=8, type="video", notes="Upload pipeline → transcoding → CDN. Recommendation. Live streaming."),
        m("HLD — Distributed unique ID (Snowflake)", "https://www.youtube.com/watch?v=W34qup6Voys", HLD, minutes=30, priority=8, type="video", notes="64-bit: timestamp + machine ID + sequence. Sortable, unique, no central coordinator."),
    ]

    GENAI = "System Design · Phase 4 · GenAI Infra"
    items += [
        m("Designing ML systems — book overview", "https://www.amazon.com/Designing-Machine-Learning-Systems-Production-Ready/dp/1098107969", GENAI, minutes=60, priority=8, type="reading", notes="Chip Huyen. Best book on production ML systems. Skim TOC, deep-read chapters 4-7."),
        m("Eugene Yan — System design for ML platforms", "https://eugeneyan.com/writing/system-design-for-discovery/", GENAI, minutes=45, priority=8, type="reading"),
        m("vLLM internals — PagedAttention paper", "https://arxiv.org/abs/2309.06180", GENAI, minutes=60, priority=8, type="paper", notes="KV cache as virtual memory pages. 2-4x throughput vs naive. Foundation of modern serving."),
        m("Continuous batching — Anyscale post", "https://www.anyscale.com/blog/continuous-batching-llm-inference", GENAI, minutes=30, priority=8, type="reading", notes="Iteration-level scheduling. Why static batching is suboptimal."),
        m("Speculative decoding", "https://arxiv.org/abs/2211.17192", GENAI, minutes=45, priority=7, type="paper", notes="Draft model + verify with big model. 2-3x decode speedup."),
        m("Building RAG at scale (Pinecone)", "https://www.pinecone.io/learn/", GENAI, minutes=60, priority=8, type="reading", notes="Embedding model choice. Chunk sizing. Hybrid retrieval (BM25 + vector). Reranking."),
        m("LLM observability — Eugene Yan", "https://eugeneyan.com/writing/llm-evaluators/", GENAI, minutes=60, priority=7, type="reading", notes="LLM-as-judge. Pitfalls (position bias, verbosity bias). Calibration."),
        m("ByteByteGo newsletter (subscribe)", "https://blog.bytebytego.com/", GENAI, minutes=30, priority=6, type="reading", notes="Weekly distributed systems + GenAI infra deep dives."),
    ]

    SD_TRACK["materials"] = items


# ============================================================================
# Assemble
# ============================================================================


def build() -> dict[str, Any]:
    add_dsa()
    add_math()
    add_llm()
    add_sd()

    for track in (DSA_TRACK, MATH_TRACK, LLM_TRACK, SD_TRACK):
        for i, item in enumerate(track["materials"], start=1):
            if not item.get("sequence"):
                item["sequence"] = i
            if item.get("block_label"):
                item["block_label"] = _clean_label(item["block_label"])
            _enrich_material_notes(item)

    return {
        "version": "1.0",
        "generated_by": "docs/generate_curriculum.py",
        "weekly_schedule": {
            "monday": [{"block": 1, "track": "dsa"}, {"block": 2, "track": "ai-math"}],
            "tuesday": [{"block": 1, "track": "dsa"}, {"block": 2, "track": "llm-ml"}],
            "wednesday": [{"block": 1, "track": "dsa"}, {"block": 2, "track": "system-design"}],
            "thursday": [{"block": 1, "track": "ai-math"}, {"block": 2, "track": "llm-ml"}],
            "friday": [{"block": 1, "track": "dsa"}, {"block": 2, "track": "system-design"}],
            "saturday": [
                {"block": 1, "track": "dsa"},
                {"block": 2, "track": "ai-math"},
                {"block": 3, "track": "llm-ml"},
                {"block": 4, "track": "system-design"},
            ],
            "sunday": [
                {"block": 1, "track": "dsa"},
                {"block": 2, "track": "ai-math"},
                {"block": 3, "track": "llm-ml"},
                {"block": 4, "track": "review"},
            ],
        },
        "tracks": [DSA_TRACK, MATH_TRACK, LLM_TRACK, SD_TRACK],
    }


if __name__ == "__main__":
    data = build()
    OUT.write_text(json.dumps(data, indent=2))
    total = sum(len(t["materials"]) for t in data["tracks"])
    print(f"Wrote {OUT.relative_to(Path.cwd()) if OUT.is_relative_to(Path.cwd()) else OUT}")
    print(f"Tracks: {len(data['tracks'])}, materials: {total}")
    for t in data["tracks"]:
        print(f"  {t['slug']:>14}: {len(t['materials']):>3} materials")
