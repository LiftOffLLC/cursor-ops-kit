#!/bin/bash
if git diff --cached --name-only | grep -E '\.env|secrets/|credentials.yml'; then
  echo '🚫 Committing secrets is not allowed!'
  exit 1
fi
