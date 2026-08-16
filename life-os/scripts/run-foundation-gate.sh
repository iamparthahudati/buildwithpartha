#!/usr/bin/env sh

set -eu

repository_root=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
gate_started=$(date +%s)

run_step() {
  step_name=$1
  shift
  step_started=$(date +%s)
  "$@"
  step_finished=$(date +%s)
  echo "GATE_TIMING $step_name $((step_finished - step_started))s"
}

run_documentation() {
  cd "$repository_root"
  node life-os/scripts/validate-docs.mjs
  node life-os/scripts/validate-dependency-locks.mjs
  node life-os/scripts/validate-ci-workflow.mjs
  git diff --check
}

install_frontend() {
  cd "$repository_root/life-os/apps/web"
  npm ci --ignore-scripts
}

verify_frontend() {
  cd "$repository_root/life-os/apps/web"
  npm test
  VITE_APP_BASE_PATH=/life-os/ \
  VITE_API_BASE_PATH=/life-os/api/v1 \
    npm run build
}

verify_backend() {
  cd "$repository_root/life-os/apps/api"
  ./gradlew clean build --no-daemon
}

verify_postgres() {
  cd "$repository_root/life-os/apps/api"
  ./scripts/verify-flyway-postgres.sh
}

verify_stack() {
  "$repository_root/life-os/scripts/smoke-foundation-stack.sh"
}

run_step documentation run_documentation
run_step frontend_install install_frontend
run_step frontend_gate verify_frontend
run_step backend_gate verify_backend
run_step postgres_gate verify_postgres
run_step stack_smoke verify_stack

gate_finished=$(date +%s)
echo "GATE_TOTAL $((gate_finished - gate_started))s"
echo "LifeOS engineering foundation gate passed."
