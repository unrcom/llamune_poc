#!/bin/bash
cd /Users/mini/dev/llamune_poc
source .venv/bin/activate
exec python -m uvicorn app.main:app \
  --host 0.0.0.0 \
  --port ${PORT:-8000} \
  --log-config /Users/mini/dev/llamune_poc/log_config.json
