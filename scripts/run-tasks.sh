#!/usr/bin/env bash
#
# run-tasks.sh — run a list of tasks, one fresh Claude Code session per task,
# sequentially and unattended. Each task is committed before the next begins,
# so every session starts from a clean tree and gets its own diff.
#
# Usage:
#   ./scripts/run-tasks.sh tasks.txt
#
# tasks.txt format: one task per line. Blank lines and lines starting with # are ignored.

set -u

TASK_FILE="${1:-tasks.txt}"
LOG_DIR="task-logs"
BRANCH="batch-tasks-$(date +%Y%m%d-%H%M%S)"

if [[ ! -f "$TASK_FILE" ]]; then
  echo "Task file not found: $TASK_FILE" >&2
  exit 1
fi

# Work on a dedicated branch so main stays untouched.
git checkout -b "$BRANCH" || { echo "Could not create branch $BRANCH" >&2; exit 1; }
mkdir -p "$LOG_DIR"

i=0
while IFS= read -r task || [[ -n "$task" ]]; do
  # skip blanks and comments
  [[ -z "${task// }" ]] && continue
  [[ "${task#\#}" != "$task" ]] && continue

  i=$((i+1))
  printf '\n========== [%03d] %s ==========\n' "$i" "$task"

  # Fresh, stateless session per task. --permission-mode acceptEdits lets it
  # edit files without prompting. Swap for --dangerously-skip-permissions if
  # you also want it to run Bash/etc. fully unattended.
  claude -p "$task" \
    --permission-mode acceptEdits \
    2>&1 | tee "$LOG_DIR/task-$(printf '%03d' "$i").log"

  # Checkpoint this task's work so the next session starts clean.
  if [[ -n "$(git status --porcelain)" ]]; then
    git add -A
    git commit -q -m "task $i: $task" \
      -m "Automated batch run — session $i of $TASK_FILE"
    echo "[committed task $i]"
  else
    echo "[task $i produced no changes]"
  fi
done < "$TASK_FILE"

echo
echo "Done. $i tasks processed on branch $BRANCH."
echo "Per-task logs in $LOG_DIR/ ; per-task commits in git log."
