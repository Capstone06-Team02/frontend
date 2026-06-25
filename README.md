# Voisk Frontend

시각장애인 사용자가 모바일 환경에서 iPhone VoiceOver와 받아쓰기 기능을 활용해 카페 메뉴를 확인하고 주문할 수 있도록 만든 Voisk 프론트엔드입니다. 화면보다 음성 안내, 포커스 순서, 즉각적인 선택 피드백을 우선으로 두고 주문 흐름을 구성했습니다.

---

## 주요 기능

| 기능 | 설명 |
| --- | --- |
| 접근성 중심 주문 | VoiceOver와 텍스트 필드 받아쓰기를 기준으로 메뉴 선택, 옵션 입력, 주문 확인 흐름을 제공 |
| 대화형 주문 | `/api/order/speak` 응답의 `response`, `quickReplies`, `slots`, `slotsComplete`, `intent`를 기준으로 현재 주문 단계를 판단 |
| 메뉴판 조회 | 매장 메뉴 캐시 API를 통해 메뉴, 카테고리, 옵션 그룹, 옵션 아이템 정보를 받아 화면에 구성 |
| 메뉴 추천 | 직접 추천 문장을 입력하거나 후보 추천 메뉴들을 선택해 백엔드 추천 API와 연동 |
| 필수 옵션 선택 | 백엔드가 요청하는 필수 옵션을 한 번에 모두 보여주지 않고, 현재 선택해야 하는 옵션 후보만 단계적으로 안내합니다. |
| 주문 확인 및 완료 | 선택된 메뉴, 필수 옵션, 가격 요약을 확인한 뒤 최종 주문 완료 화면으로 이동합니다. |
| 배포 | Vercel rewrites를 사용해 프론트엔드 라우팅과 `/api` 프록시를 HTTPS 환경에서 처리합니다. |

---

## 기술 스택

| 구분 | 기술 |
| --- | --- |
| 언어 | TypeScript |
| 프레임워크 | React |
| 빌드 도구 | Vite |
| 스타일 | Tailwind CSS |
| HTTP 클라이언트 | Axios |
| 배포 | Vercel |

> 백엔드 API 주소는 개발 환경에서는 Vite proxy, 배포 환경에서는 Vercel rewrites를 통해 `https://api.voisk.cloud`로 연결합니다.

---

## 프로젝트 구조

```text
frontend/                         # Vite + React 프로젝트 루트
├── public/                        # 정적 아이콘 및 favicon
├── src/
│   ├── api/                       # Axios 기반 백엔드 API 모듈
│   │   ├── client.ts              # 공통 API 클라이언트
│   │   ├── order.ts               # 주문, 메뉴, 옵션, 추천 API
│   │   └── recommend.ts           # 추천 API 보조 모듈
│   ├── assets/                    # 화면 이미지 리소스
│   ├── components/                # 공통 UI 컴포넌트
│   ├── constants/                 # 메뉴, 카페 옵션, 주문 상수
│   ├── hooks/                     # 음성 인식/TTS 훅
│   ├── pages/                     # 주문 단계별 화면
│   ├── types/                     # API 응답 및 화면 타입
│   └── utils/                     # 주문 파싱, 포맷팅, 음성 보조 로직
├── vite.config.ts                 # 개발 서버 및 API proxy 설정
├── vercel.json                    # Vercel SPA 라우팅 및 API rewrite
└── package.json                   # 실행 스크립트 및 의존성
```

주요 화면 흐름은 `VoiceOrderPage`를 중심으로 구성되며, `/options`, `/confirm`, `/complete` 등 단계별 라우트는 URL path에 따라 `App.tsx`에서 분기합니다.

---

## API 개요

Base path: `/api`

| 리소스 | Endpoint | 설명 |
| --- | --- | --- |
| 주문 | `POST /api/order/speak` | 사용자의 주문 문장을 보내고 주문 세션, 응답 문구, 슬롯, 추천/확인 상태를 받습니다. |
| 메뉴 | `POST /api/order/restaurants/{restaurantId}/menus/cache` | 매장의 메뉴판 데이터를 캐시하고 조회합니다. |
| 추천 | `POST /api/recommend` | 사용자가 입력한 추천 문장을 기반으로 추천 메뉴를 받습니다. |
| 추천 | `GET /api/recommend/hints` | 추천 힌트 버튼에 사용할 문구 목록을 조회합니다. |
| 추천 | `POST /api/recommend/hints/{hintId}` | 선택한 추천 힌트에 맞는 추천 메뉴를 받습니다. |
| 옵션 | `POST /api/order/required-option-summary` | 선택된 필수 옵션과 가격 요약 문구를 받습니다. |
| 옵션 | `GET /api/order/menus/{menuId}/optional-options` | 특정 메뉴의 선택 옵션 목록을 조회합니다. |
| 옵션 | `POST /api/order/option-selection` | 사용자가 고른 옵션을 현재 주문 세션에 반영합니다. |

프론트엔드는 백엔드가 내려주는 `intent`, `slots`, `quickReplies`, `slotsComplete` 값을 기준으로 화면을 결정합니다.

---

## 설계 원칙

| 원칙 | 적용 내용 |
| --- | --- |
| 정보량 최소화 | 메뉴 카드와 주문 확인 화면에서는 메뉴명, 가격, 핵심 옵션 위주로 안내합니다. 긴 설명은 기본 흐름에서 분리했습니다. |
| VoiceOver와 충돌 방지 | 자체 TTS를 과도하게 사용하지 않고, 스크린리더가 읽을 수 있는 라벨과 숨김 안내 문구를 활용합니다. |
| 명확한 포커스 순서 | 화면 진입 시 먼저 읽어야 하는 안내와 실제 조작 요소의 순서를 분리해 좌우 스와이프 탐색 흐름을 맞췄습니다. |
| 즉각적인 피드백 | 버튼 선택, 옵션 반영, API 대기, 주문 완료 상태를 짧은 문구로 알려 사용자가 입력 반영 여부를 알 수 있게 했습니다. |
| 큰 터치 영역과 대비 | 모바일 화면에서 버튼을 크게 배치하고 텍스트 대비를 높여 저시력 사용자도 사용할 수 있게 했습니다. |
| 입력 방식 병행 | 음성 받아쓰기와 버튼 직접 선택을 함께 제공해 사용자가 상황에 맞게 주문할 수 있도록 했습니다. |

---

## 해결한 문제

| 문제 | 해결 |
| --- | --- |
| VoiceOver와 자체 TTS 충돌 | 모든 안내를 음성으로 반복하지 않고, 필요한 시점에만 짧게 안내하도록 조정했습니다. |
| 마이크 기능 제거 | Web Speech API 중심 구조에서 iOS 텍스트 필드 받아쓰기 중심 구조로 변경했습니다. |
| 포커스 튐 현상 | 화면별 첫 안내 문구와 입력 요소의 순서를 조정해 VoiceOver 탐색 흐름을 안정화했습니다. |
| 옵션 선택 흐름 복잡도 | 필수 옵션을 한 화면에 모두 노출하지 않고 백엔드 응답 순서에 맞춰 단계적으로 표시했습니다. |
