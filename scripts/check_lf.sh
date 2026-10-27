#!/usr/bin/env bash
# Fails if any tracked or untracked (non-ignored) file has CRLF line endings.
set -euo pipefail

crlf_files=$(git ls-files --eol --cached --others --exclude-standard | grep 'w/crlf' | awk '{print $NF}' || true)

if [ -n "$crlf_files" ]; then
  echo "CRLF line endings found in:" >&2
  echo "$crlf_files" | sed 's/^/  - /' >&2
  echo "Convert them with dos2unix or set 'git config core.autocrlf false'." >&2
  exit 1
fi

echo "OK: all files use LF line endings"
