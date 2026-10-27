#!/usr/bin/env bash
# Validates commit messages against AGENTS.md section 8.
# Usage: check_commit.sh [base-ref]   (default: origin/main, falls back to main)
set -uo pipefail

MAX_TITLE=72
MAX_BODY_LINE=100
ACTIONS='Add|Fix|Cut|Optimise|Refactor|Delete|Docs|Style|Merge'

base="${1:-origin/main}"
if ! git rev-parse --verify --quiet "$base" >/dev/null; then
  base="main"
fi
if ! git rev-parse --verify --quiet "$base" >/dev/null; then
  echo "Base ref not found: $1" >&2
  exit 1
fi

commits=$(git rev-list --no-merges "$base..HEAD")
if [ -z "$commits" ]; then
  echo "OK: no new commits to check"
  exit 0
fi

fail=0
report() {
  echo "FAIL $1: $2" >&2
  fail=1
}

for hash in $commits; do
  short=$(git rev-parse --short "$hash")
  msg=$(git log -1 --format=%B "$hash")
  title=$(printf '%s\n' "$msg" | sed -n '1p')
  second=$(printf '%s\n' "$msg" | sed -n '2p')
  last=$(printf '%s\n' "$msg" | sed -e :a -e '/^[[:space:]]*$/{$d;N;ba' -e '}' | tail -n 1)

  [[ "$title" =~ ^($ACTIONS):\ .+ ]] || report "$short" "title must be '[Action]: description' with Action in: ${ACTIONS//|/, }"
  [ "${#title}" -le "$MAX_TITLE" ] || report "$short" "title is ${#title} chars (max $MAX_TITLE)"
  [ -z "$second" ] || report "$short" "second line must be blank"
  printf '%s\n' "$msg" | grep -qx 'What:' || report "$short" "missing 'What:' section"
  printf '%s\n' "$msg" | grep -qx 'Why:' || report "$short" "missing 'Why:' section"
  printf '%s\n' "$msg" | grep -q '^- ' || report "$short" "sections need '- ' bullets"
  [[ "$last" =~ ^DISCO-[0-9]+$ ]] || report "$short" "last line must be the ticket ID alone (DISCO-<n>)"
  if printf '%s\n' "$msg" | awk -v max="$MAX_BODY_LINE" 'length($0) > max { bad = 1 } END { exit !bad }'; then
    report "$short" "a line is longer than $MAX_BODY_LINE chars"
  fi
  if printf '%s\n' "$msg" | grep -qiE '^(Co-Authored-By|Signed-off-by|Claude-Session|Generated with|Contributed by)'; then
    report "$short" "attribution trailers are not allowed"
  fi
  if printf '%s\n' "$msg" | LC_ALL=C grep -q '[^ -~]'; then
    report "$short" "non-ASCII characters found; commit messages must be English ASCII"
  fi
done

if [ "$fail" -ne 0 ]; then
  echo "Commit format check FAILED (see AGENTS.md section 8)" >&2
  exit 1
fi
echo "OK: all commits follow the format"
