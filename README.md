# Stock Calc (Mobile Web)

React + TypeScript + Vite 기반 모바일 주식 밸류에이션 계산기입니다.

## 주요 기능

- KR/US 주요 ~380종목 검색 (KOSPI100, KOSDAQ100, S&P100, NASDAQ100)
- 선택 종목 일단위(6개월) 차트 + 현재가 표시
- EPS, BPS, PER, PBR, EV/EBITDA 표시
- 연환산 방식과 TTM 방식으로 지표 계산
- 작년/올해 1~4분기 실적(매출액/영업이익/당기순이익) 표시
- 직접 입력 모드(기본 입력 + 선택 고급 입력)
- 한국어/영어 UI 토글

## 아키텍처

```
GitHub Actions (매일 평일 22:30 UTC)
  ├─ scripts/fetch-stocks.ts (Yahoo Finance에서 데이터 수집)
  ├─ public/data/stocks/{SYMBOL}.json (종목별 정적 JSON)
  ├─ public/data/search-index.json (검색 인덱스)
  ├─ public/data/meta.json (메타데이터)
  ├─ npm run build (Vite 빌드)
  └─ dist/ → GitHub Pages 배포

브라우저
  └─ 정적 JSON만 fetch (CORS 문제 없음, API 키 불필요)
```

- 브라우저에서 외부 API를 직접 호출하지 않습니다.
- GitHub Actions가 서버사이드에서 Yahoo Finance 데이터를 수집하여 정적 JSON으로 변환합니다.
- 데이터는 repo에 커밋하지 않고 CI 빌드 시에만 생성됩니다.

## 개발 실행

```bash
npm install
npm run dev
```

로컬에서 데이터가 필요하면 먼저 fetch 스크립트를 실행하세요:

```bash
npx tsx scripts/fetch-stocks.ts
npm run dev
```

## 테스트 / 빌드

```bash
npm run test
npm run build
```

## GitHub Pages 배포

### 코드 변경 시
- `main` 브랜치 push → `.github/workflows/deploy.yml` 자동 실행
- 데이터 없이 빌드됩니다 (데이터는 별도 워크플로우에서 생성)

### 데이터 자동 갱신
- `.github/workflows/update-data.yml` — 매주 평일 22:30 UTC 자동 실행
- Yahoo Finance에서 전 종목 데이터 수집 → 빌드 → Pages 배포
- Actions 탭에서 수동 실행(workflow_dispatch)도 가능

## 종목 리스트 관리

- `scripts/tickers/us.json` — US 종목 (S&P100 + NASDAQ100)
- `scripts/tickers/kr.json` — KR 종목 (KOSPI100 + KOSDAQ100)
- 종목 구성 변경 시 해당 JSON 파일을 수동 업데이트합니다.
