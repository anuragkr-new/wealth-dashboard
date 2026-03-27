#!/usr/bin/env bash
# Merge latest main into staging and push → triggers Railway (if staging service watches branch `staging`).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

REMOTE="${REMOTE:-origin}"
MAIN_BRANCH="${MAIN_BRANCH:-main}"

git fetch "$REMOTE"

if ! git rev-parse --verify "$MAIN_BRANCH" >/dev/null 2>&1; then
  echo "Branch '$MAIN_BRANCH' not found locally. Checking out from $REMOTE/$MAIN_BRANCH"
  git checkout -B "$MAIN_BRANCH" "$REMOTE/$MAIN_BRANCH"
else
  git checkout "$MAIN_BRANCH"
  git pull "$REMOTE" "$MAIN_BRANCH"
fi

if git show-ref --verify --quiet "refs/heads/staging"; then
  git checkout staging
  git merge "$MAIN_BRANCH" --no-edit
else
  git checkout -b staging "$MAIN_BRANCH"
fi

git push -u "$REMOTE" staging

git checkout "$MAIN_BRANCH"

echo ""
echo "Done: pushed branch 'staging'. If Railway staging is wired to this branch, a deploy should start."
