#!/bin/bash
# 제갈량 상소문 - 매일 실행 스크립트 (macOS)
# 1) 상소문 창을 띄우고
# 2) 오늘의 상소가 아직 없으면 claude -p 로 about-me.md + 최근 클로드 코드 대화를 읽혀 새로 쓰게 한다.

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATA="$ROOT/data"
ARCHIVE="$DATA/archive"
TODAY="$(date +%Y-%m-%d)"
export PATH="$HOME/.local/bin:$HOME/.claude/local:/opt/homebrew/bin:/usr/local/bin:$PATH"
mkdir -p "$ARCHIVE"

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
open_window

{
  cat "$ROOT/prompt.md"
  printf '\n## 주공에 관한 기록 (about-me.md)\n\n'
  cat "$ROOT/about-me.md" 2>/dev/null
  printf '\n## 최근 클로드 코드 대화 기록 (~/.claude/history.jsonl, 아래가 최신)\n\n'
  tail -n 200 "$HOME/.claude/history.jsonl" 2>/dev/null || echo "(기록 없음)"
  LAST="$(ls "$ARCHIVE"/*.json 2>/dev/null | sort | tail -n 1)"
  if [ -n "$LAST" ]; then printf '\n## 지난 상소 (같은 조언을 되풀이하지 말 것)\n\n'; cat "$LAST"; fi
  printf '\n오늘 날짜: %s\n' "$TODAY"
} > "$DATA/prompt-full.txt"

if ! claude -p < "$DATA/prompt-full.txt" > "$DATA/out.txt" 2>"$DATA/error.log"; then
  status failed claude-error; exit 0
fi

# 첫 { 부터 마지막 } 까지 잘라내고 JSON 이 맞는지 확인 (macOS 기본 perl 사용)
if ! perl -0777 -MJSON::PP -e '
    my $t = do { local $/; <STDIN> };
    $t =~ /(\{.*\})/s or exit 1;
    my $j = $1;
    my $o = eval { JSON::PP->new->utf8->decode($j) } or exit 1;
    ref $o->{part1}{paragraphs} eq "ARRAY" && ref $o->{part2}{paragraphs} eq "ARRAY" or exit 1;
    print $j;' < "$DATA/out.txt" > "$DATA/clean.json"; then
  status failed bad-output; exit 0
fi

cp "$DATA/clean.json" "$ARCHIVE/$TODAY.json"
{ printf 'window.SANGSOMUN_TODAY = {"date":"%s","content":' "$TODAY"; cat "$DATA/clean.json"; printf '};\n'; } > "$DATA/today.js"
echo "$TODAY" > "$DATA/last-generated.txt"
status done ""
