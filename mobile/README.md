# 점과 선 — 모바일 앱 (React Native · Expo)

웹 버전(`../dots`)을 iOS·Android 앱으로 옮긴 것입니다. 디자인과 기능은 같고,
앱이라서 가능한 **푸시 알림**, **앱 아이콘 배지**, **진동 피드백**이 더해졌습니다.

## 앱에서 새로 가능해진 것
| 기능 | 내용 |
|---|---|
| 매일 리마인더 | 정해진 시각(07:00 · 08:30 · 12:00 · 19:00)에 “오늘의 점을 찍을 시간” |
| 저녁 알림 | 오늘 남은 습관이 있을 때만: “남은 습관 2개 · 오늘 기록이 없으면 지수가 0.31 내려갑니다” |
| 연속 기록 위험 알림 | 내일·모레 저녁, 앱을 열지 않으면 “12일 연속 기록 · 오늘 하나만 해도 선이 이어집니다” |
| 복귀 알림 | 3일 동안 열지 않으면 한 번: “끊긴 선은 다시 이을 수 있습니다” |
| 앱 아이콘 배지 | 오늘 남은 습관 수 |
| 진동 | 체크, 탭 이동, 하루 완료, 배지 획득 때 서로 다른 진동 |

알림은 서버 없이 기기 안에서 예약합니다. 앱을 열거나 기록할 때마다 다시 맞추기 때문에,
오늘 다 했으면 저녁 알림은 오지 않습니다. 켜고 끄는 것과 시각은 **나 → 알림**에서 바꿉니다.

## 실행해 보기
```bash
cd mobile
npm install
npx expo start          # 휴대폰에 Expo Go 앱을 깔고 QR 코드를 찍으면 바로 열립니다
npx expo start --web    # 브라우저에서 미리보기 (알림·진동은 동작하지 않음)
```
Expo Go에서는 일부 알림 기능이 제한될 수 있습니다. 알림까지 제대로 확인하려면 아래 **테스트용 빌드**를 설치하세요.

## 휴대폰에 설치 / 스토어 출시 (EAS)
Mac이나 Android Studio 없이 Expo 클라우드에서 빌드합니다. [expo.dev](https://expo.dev) 계정이 필요합니다.
```bash
npx eas-cli@latest login
npx eas-cli@latest build --profile preview --platform android   # 테스트용 APK (링크로 바로 설치)
npx eas-cli@latest build --profile production --platform ios    # App Store용 (Apple 개발자 계정 필요)
npx eas-cli@latest submit --platform ios                         # App Store Connect로 제출
```
출시 전에 `app.json`의 `ios.bundleIdentifier`, `android.package`(지금은 `com.choi.dots`)를 원하는 값으로 바꾸세요.

## 웹 버전에서 기록 옮기기
1. 웹 버전 **나 → 백업 내보내기**로 받은 파일을 열어 내용을 복사합니다.
2. 앱 **나 → 백업 불러오기**에 붙여넣습니다. 웹과 앱의 저장 형식이 같아 그대로 옮겨집니다.

## 구조
```
src/
  app/            화면 경로 (Expo Router) — (tabs)/ 오늘 · 별자리 · 성장 · 나
  screens/        각 화면
  sheets/         아래에서 올라오는 시트들 (점 찍기, 습관, 상세, 배지, 불러오기)
  lib/            화면과 분리된 계산: 연속 기록, 성장 지수, 배지, 보호권… (+ 테스트)
  store/          상태 저장(AsyncStorage)과 기록 뒤 보상(배지·보호권·신고가·레벨업)
  notify.ts       로컬 알림과 앱 아이콘 배지
  ui/             디자인 토큰, 공통 부품, 차트, 화면 틀
```

## 확인 명령
```bash
npm test            # 계산 로직 테스트 (연속 기록, 보호권, 성장 지수, 신고가, 백업 호환 …)
npx tsc --noEmit    # 타입 검사
npx expo lint       # 린트
```
