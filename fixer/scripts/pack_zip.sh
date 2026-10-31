#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
zip -r fixer-submission.zip . -x ".git/*" "*/node_modules/*" "*/target/*" ".env" "*/.env" "*/.env.local" "*/.venv/*" "*/__pycache__/*" "*/.pytest_cache/*" "*.zip"
