#!/bin/bash
PLIST="$HOME/Library/LaunchAgents/com.zhugeliang.sangsomun.plist"
launchctl unload "$PLIST" 2>/dev/null
rm -f "$PLIST"
echo "[완료] 상소문 예약을 해제했습니다. (폴더의 파일은 그대로 둡니다)"
