# Python AI Engine

Python 3.11+; FastAPI on port 8000. No database or recipient selection.

From this directory:

```sh
python -m venv .venv
# Activate .venv using the command for your shell.
python -m pip install -r requirements.txt
python -m pytest -q
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

`POST /ai/analyze-log` follows `../contracts/ai-analyze-log.*.json`.
`GET /health` returns `{"status":"ok"}`. Request validation errors return 422;
LLM timeout returns 504. Java owns its transport retry. Invalid model output
gets one validation retry, then UNKNOWN / confidence 0. A live provider error
also gives UNKNOWN rather than an invented diagnosis. Real measured stage timings
are returned even during replay. `parsed.truncated=true` warns that only the
UTF-8-safe prefix of 5 MiB / 20,000 physical lines was analyzed.

## Modes

- `REPLAY=1` (default): offline lookup by sanitized analysis inputs, schema,
  prompt and `LLM_MODEL`. A miss returns 503; no live call or guessed result.
- `REPLAY=0`: Claude tool `report_diagnosis`, temperature 0,
  `ANTHROPIC_API_KEY`, `LLM_MODEL` (default `claude-sonnet-5-5`).
- `RECORD=1` with live mode: persist validated masked tool output atomically.
- `LLM_TIMEOUT_SECONDS=20`, `LLM_CACHE_DIR=ai/cache` (default resolved relative
  to the application, independent of the process directory).

The committed SHA-256 named cache files are **curated demo fixtures**, not
claimed recordings of live Claude calls. The legacy `cache/dup_charge.json` is
retained for the repository scaffold check and is not read by the engine.
All five demo requests are in `fixtures/demo_requests.json`. Incident ID is
transport metadata and does not affect replay identity. Other analysis changes,
including a changed complaint, cannot silently reuse an unrelated diagnosis.

Rebuild demo fixtures with `python scripts/build_demo_cache.py` (requires
`pyyaml`, available via uvicorn's standard extras). This reads shared seed logs,
complaints and catalog. The current shared catalog has an unquoted comma in the
promo description: YAML parses the tail as an extra null key. The builder keeps
only contract module fields; the seed owner should quote that description.
Use `python ../scripts/sync_fixtures.py` from this directory
if shared logs change; rebuild replay after any prompt, schema or pipeline change.

## Evidence and PII

Masking runs before parsing and LLM input assembly. Email, Luhn-valid cards,
phones, Bearer/API tokens and passwords are masked while preserving physical line
numbers. Complaint and catalog strings are also masked. Model evidence must quote
an included masked line. A local offset map reconstructs the exact raw substring
as `verification_quote` only after the model returns. Partial redaction markers,
nonexistent quotes/lines and raw fragments longer than 200 characters are rejected.
Neither the model schema nor persistent replay contains `verification_quote`.
Java must verify it against raw logs and omit it from all external output.

D1–D7 are computed locally. Configure `DETECT_DUP_SECONDS=2`,
`DETECT_ERROR_COUNT=5`, `DETECT_ERROR_RATIO=0.2`, `DETECT_RETRY_COUNT=3`.
D3 requires retry/failure markers so periodic healthchecks do not become retry
storms. Signature priority is D5 > D1 > D4 > D6 > D3 > D2; D7 alone does not
supply a deduplication signature. Fingerprinting and dispatch remain in Java.
