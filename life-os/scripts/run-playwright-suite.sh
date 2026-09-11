#!/usr/bin/env sh

set -eu

repository_root=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
web_directory="$repository_root/life-os/apps/web"

echo "Running LifeOS critical Playwright suite..."

(
  cd "$web_directory"
  npm run build:test
  npx playwright test
)

echo "LifeOS critical Playwright suite passed 100% across all journeys."
