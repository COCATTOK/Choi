#!/bin/bash
# 제갈량 상소문 설치 (macOS): 매일 오전 7시 + 로그인할 때마다 실행되도록 등록
DIR="$(cd "$(dirname "$0")" && pwd)"
RUN="$DIR/run.sh"
chmod +x "$RUN"
LABEL="com.zhugeliang.sangsomun"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
mkdir -p "$HOME/Library/LaunchAgents"
cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key><array><string>/bin/bash</string><string>$RUN</string></array>
  <key>StartCalendarInterval</key><dict><key>Hour</key><integer>7</integer><key>Minute</key><integer>0</integer></dict>
  <key>RunAtLoad</key><true/>
  <key>EnvironmentVariables</key><dict><key>PATH</key><string>$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string></dict>
</dict>
</plist>
PLIST
launchctl unload "$PLIST" 2>/dev/null
launchctl load -w "$PLIST"
echo "[완료] 매일 오전 7시와 로그인할 때마다 제갈량 상소문이 올라옵니다. 지금 첫 상소를 띄웁니다."
