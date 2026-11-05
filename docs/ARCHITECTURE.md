# Architecture — PromptForge Studio v1.0

## Flow (one compile)

```
User intent (1 line)
  → detectIntent()          domain + format + fields (invoice / medical / finance / code-audit / interview / RAG / general)
  → buildP0()               naive prompt — no guards on purpose
  → buildPFinal()           role + objective + isolation + null-safety + date rule + output schema
                            format depends on model: Claude = XML tags, GPT = Markdown, DeepSeek = CoT steps
  → generateTests()         3 intent-specific tests: happy / boundary-null / injection
  → evaluate()              checks P0 vs P_final for each guard, runs each test against the guards
  → score                   60% rubric (7 checks) + 40% test passes — computed, never fixed
  → gradients               patch log, written from the actual failures found
  → UI                      artifact card (Final / Diff / Tests) + telemetry + history (localStorage)
```

## Why the score is honest now

Old PDF: `score: 97.4, latency: "1.92s", cost: "₹0.44"` — hardcoded in
`generateCompiledArtifact()` for every intent, every time.

New code (`assets/js/compiler.js`, `backend/compiler.py`):
- `latencyMs` is measured with `performance.now()` / `time.perf_counter()`.
- `costInr` is `0` — local mode makes no API call, so claiming ₹0.44 would be false.
- `score` is derived from 7 rubric checks + 3 test outcomes for *that* intent.
  A poem intent and an invoice-JSON intent get different prompts, tests and scores.

## Files and responsibilities

- `assets/js/compiler.js` — pure engine, no DOM. Testable in Node.
  Exported as `PromptForgeCompiler` (and CommonJS for Node tests).
- `assets/js/app.js` — DOM only. History, search, tabs, copy, export, telemetry.
  Never invents a score; it only renders what the compiler returned.
- `assets/css/style.css` — all styling, no Tailwind CDN. The app works
  offline and from `file://`.
- `backend/compiler.py` — Python mirror of the JS engine, same rules.
- `backend/app.py` — FastAPI. Serves `index.html` + `/assets`, and
  `POST /api/compile` for anyone who wants a server-side compile.

## What is NOT in v1.0 (deliberately)

- No Supabase / pgvector, no LangGraph, no live LLM call. Those were
  claimed in the PDF's Master Prompt but never implemented. Adding them
  needs API keys and a deployed backend — that is v2, on your go-ahead.
- No user accounts, no cloud sync. History is localStorage on one device;
  export JSON to move it.
