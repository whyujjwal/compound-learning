# The Compound Mastery Curriculum

A 6-month integrated roadmap to achieve durable competence in **Data Structures & Algorithms**, **Distributed System Design**, **Mathematics for AI**, and **LLM/Machine Learning** — designed for execution inside the Compound platform.

> **Philosophy:** Mastery is not a function of hours dedicated, but of *deliberate, spaced, and connected* practice across many small atomic units. This curriculum is structured to compound — each topic feeds the next, and FSRS keeps it all alive in memory.

---

## How this works

1. **Open Compound → Today.** You see the day's blocks already laid out: which domain, which materials, with one-click links to the practice destination (LeetCode, YouTube, book chapter, paper, repo). Zero decision fatigue.
2. **Work the block.** Each material has notes for spaced review; click the **"Practice now ↗"** button to jump straight to the source.
3. **Rate after.** Mark *Again / Hard / Good / Easy*. FSRS schedules the next review automatically.
4. **Ask Coach.** "What's lagging this week?" — the AI has tool access to your stats and tells you the truth.

All of the materials below are pre-loaded as `study_materials` in the platform via `docs/curriculum.json`. Run **`python -m app.seed_curriculum`** or **`POST /api/curriculum/import/default`** to ingest.

---

## Weekly cadence

Two 2-hour blocks per weekday, four 2-hour blocks per weekend day → **38 hours/week**.

| Day | Block 1 (high focus) | Block 2 | Block 3 | Block 4 |
|---|---|---|---|---|
| **Mon** | DSA · pattern day | Math · linear algebra | | |
| **Tue** | DSA · pattern day | LLM/ML · build | | |
| **Wed** | DSA · pattern day | System Design · LLD | | |
| **Thu** | Math · calculus / prob | LLM/ML · paper read | | |
| **Fri** | DSA · contest / hard | System Design · HLD | | |
| **Sat** | DSA · weekend deep | Math · derivations | LLM/ML · project | System Design · case study |
| **Sun** | DSA · review pass | Math · review pass | LLM/ML · review pass | Project / write-up |

**Weekly hours**: DSA 12 · Math 10 · LLM/ML 8 · System Design 6 · Project 2

> Each weekday morning block is **DSA or Math** (peak cognition tasks); afternoons are reading/building. Weekends widen the surface area.

---

## Curriculum at a glance

| Track | Source of truth | Duration | Materials |
|---|---|---|---|
| **DSA** | [Striver A2Z (TUF)](https://takeuforward.org/strivers-a2z-dsa-course/strivers-a2z-dsa-course-sheet-2) | 18 steps · ~16 weeks | ~120 milestone problems + concepts |
| **Math for AI** | [Deisenroth MML](https://mml-book.github.io/) · [3Blue1Brown](https://www.3blue1brown.com/topics/linear-algebra) · [Imperial Coursera](https://www.coursera.org/specializations/mathematics-machine-learning) | 10 chapters · ~12 weeks | ~70 lectures + problem sets |
| **LLM/ML** | [Andrew Ng DLS](https://www.coursera.org/specializations/deep-learning) · [Karpathy zero-to-hero](https://karpathy.ai/zero-to-hero.html) · key papers | ~16 weeks | ~80 lectures + builds + papers |
| **System Design** | [Donne Martin Primer](https://github.com/donnemartin/system-design-primer) · [Sandeep Kumar Roadmap](https://github.com/sandeepkumar-skb/system_design_roadmap) · [ByteByteGo](https://bytebytego.com/) | ~12 weeks | ~60 patterns + case studies |

---

## DSA — Striver A2Z (chosen over NeetCode 150)

**Why Striver A2Z over NeetCode 150:** Striver builds from absolute basics (syntax → arrays → DP → graphs → strings) with a video for every step, optimized for *first-time learning*. NeetCode is curated interview prep — phenomenal but assumes baseline. For a 6-month mastery arc, Striver wins.

**Working through it:** Each Striver "step" is one or more blocks. Don't just solve — *learn the pattern, articulate the invariant, then code*. The platform stores both the pattern card (for spaced review) and the LeetCode URL (for re-solving).

### The 18 steps

1. **Learn the basics** (Day 1–10) — language fundamentals, time complexity, basic math, recursion warmup, hashing
2. **Sorting** (Day 11–13) — selection / bubble / insertion → merge / quick
3. **Arrays** (Day 14–25) — easy → medium → hard patterns
4. **Binary search** (Day 26–32) — 1D / 2D / answer-space search
5. **Strings I — basic** (Day 33–35)
6. **Linked list** (Day 36–43)
7. **Recursion** (Day 44–48) — subsequence / subset patterns
8. **Bit manipulation** (Day 49–51)
9. **Stack & queues** (Day 52–58) — monotonic stack patterns
10. **Sliding window / two pointers** (Day 59–64)
11. **Heaps** (Day 65–67)
12. **Greedy** (Day 68–70)
13. **Binary trees** (Day 71–80) — traversals, views, LCA, transformations
14. **BST** (Day 81–84)
15. **Graphs** (Day 85–95) — BFS/DFS → topo → shortest paths → DSU → MST
16. **DP** (Day 96–110) — 1D → 2D → subsequences → strings → stocks → partition
17. **Tries** (Day 111–112)
18. **Strings II — advanced** (Day 113–115) — KMP, Z-algorithm, Rabin-Karp

The platform stores the **top ~120 milestone problems** with direct LeetCode links plus full pattern notes. The Striver sheet remains the canonical reference for the remaining ~330 problems.

---

## Mathematics for AI — Deisenroth MML

**Source:** [*Mathematics for Machine Learning* by Deisenroth, Faisal, Ong](https://mml-book.github.io/) (free PDF) — paired with [3Blue1Brown's Essence of Linear Algebra](https://www.3blue1brown.com/topics/linear-algebra) and [Essence of Calculus](https://www.3blue1brown.com/topics/calculus) for intuition.

### 10-chapter arc

| # | Chapter | Why it matters for ML |
|---|---|---|
| 2 | Linear Algebra | The substrate of every model — vectors, matrices, rank, null space |
| 3 | Analytic Geometry | Inner products, norms, projections → distances in embedding space |
| 4 | Matrix Decompositions | Eigen / SVD — PCA, recommender systems, attention math |
| 5 | Vector Calculus | Gradients, Jacobians, Hessians → backprop, optimization |
| 6 | Probability | Bayesian thinking, likelihood, KL divergence → all of generative ML |
| 7 | Continuous Optimization | Convexity, gradient descent variants → why Adam works |
| 9 | Linear Regression | Closed-form + gradient → first non-trivial model |
| 10 | Dimensionality Reduction | PCA from first principles |
| 11 | Density Estimation | Gaussian mixtures, EM algorithm |
| 12 | Classification | SVMs, kernel methods |

Each chapter → 4–6 study materials in the platform: read the chapter, watch the paired 3B1B video, do the worked examples, summarize in 5 cards.

---

## LLM / Machine Learning

A bottom-up build: **fundamentals → architectures → modern stacks**. We don't skip layers.

### Phase 1 — Fundamentals (Weeks 1–4)
- [Andrew Ng — Machine Learning Specialization (Coursera)](https://www.coursera.org/specializations/machine-learning-introduction) — supervised → unsupervised → RL basics
- [3Blue1Brown — Neural Networks](https://www.3blue1brown.com/topics/neural-networks) — intuition for backprop

### Phase 2 — Build from scratch (Weeks 5–8)
- [Karpathy — Neural Networks: Zero to Hero](https://karpathy.ai/zero-to-hero.html) — micrograd → makemore → GPT in PyTorch
- [Karpathy — nanoGPT](https://github.com/karpathy/nanoGPT) — train a small GPT-2 on Shakespeare

### Phase 3 — Transformers & LLMs (Weeks 9–12)
- ["Attention is All You Need" — Vaswani et al.](https://arxiv.org/abs/1706.03762)
- [Annotated Transformer](http://nlp.seas.harvard.edu/2018/04/03/attention.html)
- [The Illustrated Transformer — Jay Alammar](https://jalammar.github.io/illustrated-transformer/)
- [Hugging Face course](https://huggingface.co/learn/llm-course)

### Phase 4 — Alignment & RAG (Weeks 13–16)
- [InstructGPT paper](https://arxiv.org/abs/2203.02155)
- [DPO — Rafailov et al.](https://arxiv.org/abs/2305.18290)
- [LoRA — Hu et al.](https://arxiv.org/abs/2106.09685)
- [LangChain docs](https://python.langchain.com/) + RAG project build

### Capstone project (parallel to phases 2–4)
Build a domain-specific RAG system: ingest corpus → embeddings → retrieval → LLM → eval. Ship it.

---

## System Design

### Phase 1 — LLD foundations (Weeks 1–4)
- [Refactoring Guru — Design Patterns](https://refactoring.guru/design-patterns) — all 23 GoF patterns
- [SOLID principles](https://en.wikipedia.org/wiki/SOLID)
- LLD problems: Parking lot, Elevator, Vending machine, Splitwise, Chess, Snake & Ladder

### Phase 2 — Building blocks (Weeks 5–7)
[Donne Martin Primer](https://github.com/donnemartin/system-design-primer) sections:
- Load balancers · DNS · CDN
- Databases: SQL vs NoSQL, replication, sharding, federation
- Cache strategies: cache-aside / write-through / write-behind / refresh-ahead
- Async: message queues, pub-sub, backpressure
- Communication: TCP vs UDP, REST vs gRPC

### Phase 3 — HLD case studies (Weeks 8–12)
One full system design per week with sketch + tradeoffs:
URL shortener · Twitter feed · Netflix · Uber dispatch · WhatsApp · Instagram · Dropbox · YouTube · Search autocomplete · Distributed cache · Rate limiter · Notification system

### Phase 4 — Modern GenAI infra (ongoing reading)
[The GenAI System Design Newsletter](https://blog.bytebytego.com/) · KV cache · speculative decoding · tensor parallelism · model serving (vLLM, TGI) · embedding pipelines

---

## Milestones & cadence checks

| Week | DSA milestone | Math | LLM/ML | System Design |
|---|---|---|---|---|
| 4 | All array + binary-search patterns clean | Linear algebra done | Andrew Ng C1 | GoF patterns + 4 LLDs |
| 8 | LL + recursion + bit manip done | Calculus + optimization done | Karpathy makemore done | All building blocks |
| 12 | Trees + BST + graphs done | Probability + linear regression done | Transformer paper implemented | 6 HLD case studies |
| 16 | DP + tries + advanced strings done | All 10 chapters done | RAG project shipped | 12 HLD case studies + write-ups |
| 20 | Striver A2Z complete, hard problems | Advanced topics: GMM, SVM | Fine-tuning + DPO | Mock HLD interviews |
| 24 | LeetCode contests | Refresh + applied math | Multi-agent build | GenAI infra deep dive |

> **Coach** sees all your real numbers — ask it weekly: *"Where am I behind plan?"*

---

## How the platform schedules this

Every material has:

| Field | Meaning |
|---|---|
| `block_label` | e.g. `"DSA · Day 14 · Arrays — Sliding Window"` — Today groups by this |
| `external_url` | one-click destination (LeetCode / YouTube / arxiv / GitHub) |
| `priority_percent` | 0–10 = critical (never auto-postpone); 50 = normal; 80+ = stretch goal |
| `estimated_minutes` | feeds the 2-hour block packing |
| `notes` | what you review during spaced repetition (the pattern, not the syntax) |
| `cognitive_cost_multiplier` | 1.0 default, higher for proof-heavy or systems-design depth |

**FSRS-6** handles when to *re-surface* a card for review. The curriculum determines what *enters* the queue. Together: you always see today's new content + today's optimal reviews.

---

## Importing the curriculum

```bash
# CLI (recommended once)
cd backend && source .venv/bin/activate
python -m app.seed_curriculum

# Or via API (after the API is up)
curl -X POST http://localhost:8000/api/curriculum/import/default
```

The import is **idempotent** — running it again updates existing materials (by title + track) and creates anything new. Safe to iterate.

---

## Extending the curriculum

`docs/curriculum.json` is the source of truth. Edit it directly:

```json
{
  "tracks": [
    {
      "slug": "dsa",
      "name": "Data Structures & Algorithms",
      "color": "#22c55e",
      "materials": [
        {
          "title": "Two Sum — Hash Map Pattern",
          "block_label": "DSA · Day 14 · Arrays — Hashing",
          "type": "practice",
          "url": "https://leetcode.com/problems/two-sum/",
          "estimated_minutes": 25,
          "priority_percent": 8,
          "notes": "Single pass hash map. For each i, check if target-nums[i] is already in map. O(n)/O(n)."
        }
      ]
    }
  ]
}
```

Then re-run `python -m app.seed_curriculum`. Or hand the JSON to Coach: *"add these 12 new materials to the LLM/ML track"* — Coach can write a properly shaped JSON snippet and you re-import.

---

## A note on completeness

This curriculum is **a strong foundation**, not exhaustive. Striver A2Z is 450 problems; we seed ~120 milestones. Deisenroth has thousands of exercises; we seed ~70 lectures. The intent is to give the platform real, daily, clickable structure — then **you** add what you discover (a great YouTube lecture, a paper, a tricky LC problem you want to revisit) by clicking "+ Add Material".

The platform is designed to compound: every review tightens the model of your memory, every new card refines the schedule, every Coach conversation surfaces what's actually working. Start tomorrow.
