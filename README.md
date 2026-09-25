# Choi

## 💎 황금 키워드 도구

| 페이지 | 필요한 것 | 알려주는 것 |
|---|---|---|
| `keyword.html` | 없음 (파일만 열면 됨) | 네이버·구글 자동완성 기반 황금 키워드 후보 |
| `kiwi.html` | 네이버 API 키 + `node server.js` | 블랙키위처럼 검색량 · 발행량 · 포화도 · 예상 CPC · 월별 추이 · 연관 키워드 |

## 딸깍 키워드 분석(kiwi.html) 켜는 법

### 1. 준비물
- [Node.js](https://nodejs.org) 18 이상 설치 (LTS 버전 받으면 돼요)

### 2. API 키 받기 (둘 다 무료)
**① 네이버 검색광고 API** (검색량, 광고 경쟁도, 예상 CPC)
1. [searchad.naver.com](https://searchad.naver.com) 가입 (광고비 충전 안 해도 돼요)
2. 로그인 → 오른쪽 위 **도구 → API 사용 관리** → **네이버 검색광고 API 서비스 신청**
3. 나오는 **엑세스라이선스**, **비밀키**, **CUSTOMER_ID** 3개를 메모

**② 네이버 오픈 API** (블로그 발행량, 데이터랩 트렌드)
1. [developers.naver.com](https://developers.naver.com) → **Application → 애플리케이션 등록**
2. 사용 API에서 **검색**, **데이터랩(검색어트렌드)** 두 개 추가
3. 환경은 **WEB 설정** → 서비스 URL에 `http://localhost:3000`
4. 나오는 **Client ID**, **Client Secret** 메모

### 3. 키 넣기
`.env.example` 파일을 복사해서 이름을 `.env` 로 바꾸고, 메모한 값 5개를 채워요.
```
SEARCHAD_API_KEY=엑세스라이선스
SEARCHAD_SECRET_KEY=비밀키
SEARCHAD_CUSTOMER_ID=CUSTOMER_ID
NAVER_CLIENT_ID=Client ID
NAVER_CLIENT_SECRET=Client Secret
```

### 4. 실행
이 폴더에서 터미널(명령 프롬프트)을 열고:
```
node server.js
```
→ 브라우저로 **http://localhost:3000/kiwi.html** 접속 → 키워드 넣고 딸깍!

> 키 받기 전에 화면만 보고 싶으면 `node server.js --mock` — 가짜 숫자로 보여줘요.

### 사용량 한도
- 오픈 API 검색: 하루 25,000회 → 한 번 분석할 때 최대 41회 쓰니까 하루 약 600번 분석 가능
- 데이터랩: 하루 1,000회
- 같은 키워드는 1시간 동안 저장해 두고 다시 조회하지 않아요
