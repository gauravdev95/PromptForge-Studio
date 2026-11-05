# PromptForge Studio — Autonomous Prompt Compiler

**New name, proper structure, fully running.** Formerly the single-file
`PromptCompiler Studio` PDF (a printed HTML file). This is the rebuilt
project: same idea, real engine, no fake numbers.

## The idea (in one line)

ChatGPT gives you *a* prompt. PromptForge gives you a **tested** prompt:
it builds a naive P₀, generates 3 intent-specific traps, runs real local
checks against them, patches the failures, and shows the score it
actually computed.

## What is unique vs. plain ChatGPT

| Plain ChatGPT | PromptForge Studio |
|---|---|
| 1 prompt, untested | P₀ → 3 traps → patched P_final |
| Guesses missing values | Null-safety: missing → `null`, never guess |
| Follows injected instructions | Untrusted-input isolation + security boundary |
| No score, or a made-up one | Score = 60% rubric + 40% test passes, computed per intent |
| No history | Saved sessions in localStorage, search + JSON export |
| One format | Claude XML / GPT-4o Markdown / DeepSeek CoT — format really changes |

## Project structure

```
promptforge-studio/
├── index.html                  # App shell (3-pane UI)
├── assets/
│   ├── css/style.css           # Dark theme, no CDN — works offline
│   └── js/
│       ├── compiler.js         # Core engine: parse → P0 → P_final → tests → score
│       └── app.js              # UI: history, tabs, telemetry, copy/export
├── backend/
│   ├── compiler.py             # Python port of the same engine
│   ├── app.py                  # FastAPI: serves UI + POST /api/compile
│   └── requirements.txt
├── tests/
│   └── test_compiler.py        # pytest, no network / no API key
├── docs/ARCHITECTURE.md
└── README.md
```

## Run it — 3 ways (pick one)

### 1. Fastest — just open the file (no install)
Open `index.html` in any browser (phone / laptop). Everything runs
locally in the browser. No server, no API key, ₹0.00.

### 2. With the backend (recommended on laptop)
```bash
cd promptforge-studio
pip install -r backend/requirements.txt
python backend/app.py
# open http://localhost:8000
# API: POST /api/compile  {"intent": "...", "model": "Claude 4 Sonnet (XML)"}
#      GET  /api/health
```

### 3. Run the tests
```bash
python -m pytest tests/test_compiler.py -v
# also: node --check assets/js/compiler.js && node --check assets/js/app.js
```

## Try it
1. Type: `Extract structured invoice JSON (vendor, ISO date, line items, tax) from messy OCR text`
2. Click **Compile & Stress-Test**.
3. Check the tabs: **Final Prompt** / **P₀ vs Patched Diff** / **3× Tests**,
   and the right panel: score, latency (real ms), cost ₹0.00, gradient log.
4. Switch the model at the top — the prompt format really changes.

## Honest limits (read this before demoing it)

- **Local mode is rule-based, not an LLM.** It checks the prompt's
  guards and simulates the 3 traps against those guards. It does *not*
  call Claude / GPT / Gemini, so it cannot catch every semantic failure
  a real model would make.
- The old PDF claimed `97.4% / 1.92s / ₹0.44` for *every* intent and
  claimed Supabase / FastAPI / LangGraph / Gemini Flash. That was a
  simulation: the score, latency and cost were hardcoded, and there was
  no backend or database call at all.
- **Next upgrade (optional, not built yet):** add a Gemini API key field
  (stored only in your browser) to run the 3 traps through a real model
  and score the real outputs. Say the word and I will add it — it needs
  your key, so I will not add it silently.

## Rename note
Old name: **PromptCompiler Studio** (generic, and it was only a PDF
printout). New name: **PromptForge Studio** — same idea, distinct name,
proper project. Change it in one place if you want another name:
`index.html` (`<title>` + header) and `README.md`.
