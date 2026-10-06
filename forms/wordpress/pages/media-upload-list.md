# 워드프레스 미디어에 올릴 파일 목록

서식 페이지 5종(`wp-form-*.html`)이 이 파일들을 가리킵니다. **영문 파일명으로 바꾼 복사본이 `forms/wordpress/upload/` 에 이미 들어 있으니** 그 폴더의 파일을 미디어 라이브러리에 한 번에 올리면 됩니다. (이 문서는 `build-wp-pages.js` 가 자동 생성)

## 올리는 방법
1. 워드프레스 관리자 → **미디어 → 새로 추가** → `upload/` 폴더의 파일을 끌어다 놓기
2. 파일 하나를 열어 **파일 URL** 을 확인합니다. 예: `https://내사이트/wp-content/uploads/2026/10/incomedown-resignation-letter.docx`
3. 페이지 링크의 기본 주소는 `/wp-content/uploads/2026/10/` 입니다. **URL 의 폴더(연/월)가 다르면** 아래처럼 다시 생성하세요.
   `node build-wp-pages.js --base /wp-content/uploads/2026/11/`
4. 같은 이름 파일이 이미 있으면 워드프레스가 `-1` 을 붙입니다. 그러면 링크가 어긋나므로 기존 파일을 지우고 다시 올리세요.

## 꼭 확인할 것 — HWP 파일
- 워드프레스는 **`.hwp` 업로드를 기본으로 막습니다**("보안상 이 파일 형식은 허용되지 않습니다"). 허용하려면 파일 형식 허용 플러그인(예: File Upload Types)이나 테마 설정이 필요합니다.
- 어려우면 HWP 4개(이직확인서 1, 수급자격 노무제공자·단기노무제공자 2)만 ZIP 으로 묶어 올리는 방식으로 바꿀 수 있으니 알려 주세요. PDF 는 그대로 올라갑니다.

## 전체 30개 · 약 2.4MB

### 자체 양식 — DOCX (5개)

| # | 업로드 파일명 | 내용 | 용량 | 원본 위치 | 쓰이는 페이지 |
|---|---|---|---|---|---|
| 1 | `incomedown-resignation-letter.docx` | 사직서 (워드) | 11KB | `forms/1_사직서.docx` | own-forms-guide |
| 2 | `incomedown-employment-certificate.docx` | 재직증명서 (워드) | 11KB | `forms/2_재직증명서.docx` | own-forms-guide |
| 3 | `incomedown-career-certificate.docx` | 경력증명서 (워드) | 11KB | `forms/3_경력증명서.docx` | own-forms-guide |
| 4 | `incomedown-annual-leave-request.docx` | 연차휴가신청서 (워드) | 11KB | `forms/4_연차휴가신청서.docx` | own-forms-guide |
| 5 | `incomedown-severance-interim-request.docx` | 퇴직금 중간정산 신청서 (워드) | 11KB | `forms/5_퇴직금중간정산신청서.docx` | own-forms-guide |

### 자체 양식 — PDF (5개)

| # | 업로드 파일명 | 내용 | 용량 | 원본 위치 | 쓰이는 페이지 |
|---|---|---|---|---|---|
| 1 | `incomedown-resignation-letter.pdf` | 사직서 (PDF) | 62KB | `forms/1_사직서.pdf` | own-forms-guide |
| 2 | `incomedown-employment-certificate.pdf` | 재직증명서 (PDF) | 57KB | `forms/2_재직증명서.pdf` | own-forms-guide |
| 3 | `incomedown-career-certificate.pdf` | 경력증명서 (PDF) | 63KB | `forms/3_경력증명서.pdf` | own-forms-guide |
| 4 | `incomedown-annual-leave-request.pdf` | 연차휴가신청서 (PDF) | 66KB | `forms/4_연차휴가신청서.pdf` | own-forms-guide |
| 5 | `incomedown-severance-interim-request.pdf` | 퇴직금 중간정산 신청서 (PDF) | 82KB | `forms/5_퇴직금중간정산신청서.pdf` | own-forms-guide |

### 자체 양식 — 이미지(빈 양식 미리보기·작성 예시) (10개)

| # | 업로드 파일명 | 내용 | 용량 | 원본 위치 | 쓰이는 페이지 |
|---|---|---|---|---|---|
| 1 | `incomedown-resignation-letter-blank.png` | 사직서 빈 양식 미리보기 이미지 | 48KB | `forms/preview/1_사직서.png` | own-forms-guide |
| 2 | `incomedown-resignation-letter-example.png` | 사직서 작성 예시 이미지 | 91KB | `forms/examples/1_사직서_작성예시.png` | own-forms-guide |
| 3 | `incomedown-employment-certificate-blank.png` | 재직증명서 빈 양식 미리보기 이미지 | 39KB | `forms/preview/2_재직증명서.png` | own-forms-guide |
| 4 | `incomedown-employment-certificate-example.png` | 재직증명서 작성 예시 이미지 | 79KB | `forms/examples/2_재직증명서_작성예시.png` | own-forms-guide |
| 5 | `incomedown-career-certificate-blank.png` | 경력증명서 빈 양식 미리보기 이미지 | 40KB | `forms/preview/3_경력증명서.png` | own-forms-guide |
| 6 | `incomedown-career-certificate-example.png` | 경력증명서 작성 예시 이미지 | 89KB | `forms/examples/3_경력증명서_작성예시.png` | own-forms-guide |
| 7 | `incomedown-annual-leave-request-blank.png` | 연차휴가신청서 빈 양식 미리보기 이미지 | 49KB | `forms/preview/4_연차휴가신청서.png` | own-forms-guide |
| 8 | `incomedown-annual-leave-request-example.png` | 연차휴가신청서 작성 예시 이미지 | 89KB | `forms/examples/4_연차휴가신청서_작성예시.png` | own-forms-guide |
| 9 | `incomedown-severance-interim-request-blank.png` | 퇴직금 중간정산 신청서 빈 양식 미리보기 이미지 | 69KB | `forms/preview/5_퇴직금중간정산신청서.png` | own-forms-guide |
| 10 | `incomedown-severance-interim-request-example.png` | 퇴직금 중간정산 신청서 작성 예시 이미지 | 118KB | `forms/examples/5_퇴직금중간정산신청서_작성예시.png` | own-forms-guide |

### 법령 서식 — PDF (7개)

| # | 업로드 파일명 | 내용 | 용량 | 원본 위치 | 쓰이는 페이지 |
|---|---|---|---|---|---|
| 1 | `law-leave-confirmation-75-4-rev20250701.pdf` | 이직확인서 별지 제75호의4서식 (PDF) | 92KB | `forms/pages/files/이직확인서_별지75호의4_개정2025.7.1.pdf` | leave-confirmation |
| 2 | `law-eligibility-75-rev20241231-regular.pdf` | 수급자격 인정신청서 상용근로자용 (PDF) | 159KB | `forms/pages/files/수급자격인정신청서_별지75호_개정2024.12.31_상용근로자.pdf` | eligibility |
| 3 | `law-eligibility-75-rev20241231-daily.pdf` | 수급자격 인정신청서 일용근로자용 (PDF) | 159KB | `forms/pages/files/수급자격인정신청서_별지75호_개정2024.12.31_일용근로자.pdf` | eligibility |
| 4 | `law-eligibility-75-rev20241231-artist.pdf` | 수급자격 인정신청서 예술인용 (PDF) | 159KB | `forms/pages/files/수급자격인정신청서_별지75호_개정2024.12.31_예술인.pdf` | eligibility |
| 5 | `law-eligibility-75-rev20241231-short-artist.pdf` | 수급자격 인정신청서 단기예술인용 (PDF) | 159KB | `forms/pages/files/수급자격인정신청서_별지75호_개정2024.12.31_단기예술인.pdf` | eligibility |
| 6 | `law-eligibility-75-rev20241231-platform.pdf` | 수급자격 인정신청서 노무제공자용 (PDF) | 159KB | `forms/pages/files/수급자격인정신청서_별지75호_개정2024.12.31_노무제공자.pdf` | eligibility |
| 7 | `law-eligibility-75-rev20241231-short-platform.pdf` | 수급자격 인정신청서 단기노무제공자용 (PDF) | 159KB | `forms/pages/files/수급자격인정신청서_별지75호_개정2024.12.31_단기노무제공자.pdf` | eligibility |

### 법령 서식 — HWP (3개)

| # | 업로드 파일명 | 내용 | 용량 | 원본 위치 | 쓰이는 페이지 |
|---|---|---|---|---|---|
| 1 | `law-leave-confirmation-75-4-rev20250701.hwp` | 이직확인서 별지 제75호의4서식 (HWP) | 65KB | `forms/pages/files/이직확인서_별지75호의4_개정2025.7.1.hwp` | leave-confirmation |
| 2 | `law-eligibility-75-rev20241231-platform.hwp` | 수급자격 인정신청서 노무제공자용 (HWP) | 107KB | `forms/pages/files/수급자격인정신청서_별지75호_개정2024.12.31_노무제공자.hwp` | eligibility |
| 3 | `law-eligibility-75-rev20241231-short-platform.hwp` | 수급자격 인정신청서 단기노무제공자용 (HWP) | 107KB | `forms/pages/files/수급자격인정신청서_별지75호_개정2024.12.31_단기노무제공자.hwp` | eligibility |

## 올리지 않는 것
- **표준근로계약서**, **산재 요양급여신청서**: 파일을 올리지 않고 고용노동부·근로복지공단 공식 사이트 링크만 사용합니다. (재배포 조건을 확인하지 못했기 때문)
