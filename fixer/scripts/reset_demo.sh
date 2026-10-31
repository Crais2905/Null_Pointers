#!/usr/bin/env bash
set -euo pipefail
curl --fail --silent --show-error -X POST http://localhost:8080/api/reset
printf '\nreset ok\n'
