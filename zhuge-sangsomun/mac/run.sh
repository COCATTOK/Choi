#!/bin/bash
# 제갈량 상소문 - 매일 실행 스크립트 (macOS)
# 1) 오늘의 상소가 아직 없으면 claude -p 에게 prompt.md 대로 새 상소를 써서 data/today.js 에 저장하게 하고,
# 2) 다 쓰면 상소문 창을 띄운다.

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATA="$ROOT/data"
TODAY="$(date +%Y-%m-%d)"
export PATH="$HOME/.local/bin:$HOME/.claude/local:/opt/homebrew/bin:/usr/local/bin:$PATH"
mkdir -p "$DATA"

status() { printf "window.SANGSOMUN_STATUS = {state:'%s', date:'%s', reason:'%s'};\n" "$1" "$TODAY" "$2" > "$DATA/status.js"; }

open_window() {
  local url="file://${ROOT// /%20}/sangsomun.html"
  if [ -d "/Applications/Google Chrome.app" ]; then
    open -na "Google Chrome" --args --app="$url" --window-size=1180,900
  else
    open "$ROOT/sangsomun.html"
  fi
}

if [ "$(cat "$DATA/last-generated.txt" 2>/dev/null)" = "$TODAY" ]; then open_window; exit 0; fi
if ! mkdir "$DATA/writing.lock" 2>/dev/null; then
  # 15분 넘게 남은 잠금은 이전 실행의 잔재로 보고 치운다
  if [ -n "$(find "$DATA/writing.lock" -maxdepth 0 -mmin +15)" ]; then rmdir "$DATA/writing.lock"; mkdir "$DATA/writing.lock"; else open_window; exit 0; fi
fi
trap 'rmdir "$DATA/writing.lock" 2>/dev/null' EXIT

if ! command -v claude >/dev/null 2>&1; then status failed claude-not-found; open_window; exit 0; fi

status writing ""

cd "$ROOT"
{ cat prompt.md; printf '\nTODAY: %s\n' "$TODAY"; } > "$DATA/prompt-full.txt"
claude -p --allowedTools "Read,Write" --add-dir "$HOME/.claude" < "$DATA/prompt-full.txt" > "$DATA/claude-log.txt" 2>&1

if grep -q "$TODAY" "$DATA/today.js" 2>/dev/null; then
  echo "$TODAY" > "$DATA/last-generated.txt"
  status done ""
else
  status failed bad-output
fi
open_window
