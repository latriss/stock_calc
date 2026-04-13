# 연환산/TTM 방식의 PER 계산기
[?? ?? ??? ??? ? ?? ?? ????](https://blog.naver.com/latriss/224251323952)


React + TypeScript + Vite 기반의 모바일 웹 주식 조회 및 밸류에이션 계산기입니다.

조회 모드에서는 사전 생성된 정적 데이터를 이용해 종목 검색, 차트 조회, 분기 실적 확인, 지표 계산을 제공합니다.  
직접 입력 모드에서는 사용자가 분기 실적과 주가를 입력해 연환산/TTM 기준 지표를 계산할 수 있습니다.

## 주요 기능

- 모바일 우선 UI
- 종목 검색
  - 주식명 또는 티커로 검색
  - 현재 조회 대상: KOSPI 100, KOSDAQ 100, S&P 100, NASDAQ 100 기반 종목 목록
- 조회 모드
  - 현재가 표시
  - 최근 6개월 일단위 차트 표시
  - 작년/올해 1~4분기 실적 표시
  - EPS, BPS, PER, PBR, EV/EBITDA 계산
  - 연환산 / TTM 기준 결과 동시 표시
- 직접 입력 모드
  - 분기별 매출액, 영업이익, 당기순이익 입력
  - 현재 주가 입력
  - 선택 고급 입력: 시가총액, 주식수, 자본총계, 총부채, 현금성자산, EBITDA
  - EPS는 순이익과 주식수로 자동 계산
  - EBITDA는 필요할 때만 직접 입력해 EV/EBITDA 계산에 사용
- 한국어 / 영어 UI 전환
- 첫 화면에 조회 가능 범위와 데이터 기준일 표시

## 최근 변경 사항

- 앱 제목을 `연환산/TTM 방식의 PER 계산기`로 변경
- 첫 화면에 조회 가능 범위 안내 추가
- 첫 화면에 데이터 기준일 표시 추가
- 직접 입력 분기표에서 `감가상각/상각` 입력 제거
- 직접 입력 분기표에서 `EBITDA` 직접 입력 방식으로 변경
- 직접 입력에서는 `EPS`를 자동 계산하도록 정리
- 숫자 입력칸에 3자리마다 `,` 표시되도록 정리
- 조회 데이터를 직접 입력으로 복사할 때 현재 연도 입력 틀이 유지되도록 수정
- GitHub Pages 배포 시 정적 데이터가 자동 생성되도록 배포 워크플로 수정

## 기술 스택

- React 19
- TypeScript
- Vite
- Recharts
- Vitest
- GitHub Actions
- GitHub Pages

## 프로젝트 구조

```text
src/
  App.tsx                 메인 화면
  i18n.ts                 다국어 문구
  lib/
    calculations.ts       연환산 / TTM 계산 로직
    formatters.ts         숫자 / 날짜 포맷
    manual.ts             직접 입력 상태 변환 로직
    staticData.ts         정적 JSON 로딩
scripts/
  fetch-stocks.ts         Yahoo Finance 데이터 수집
  tickers/
    us.json               미국 대상 종목 목록
    kr.json               한국 대상 종목 목록
.github/workflows/
  deploy.yml              push 시 데이터 생성 + 빌드 + 배포
  update-data.yml         예약 데이터 갱신 + 배포
```

## 실행 방법

### 1. 의존성 설치

```bash
npm install
```

### 2. 로컬 데이터 생성

이 프로젝트는 `public/data`를 깃에 직접 올리지 않고, 스크립트로 생성합니다.

```bash
npm run data:fetch
```

생성 결과:

- `public/data/search-index.json`
- `public/data/meta.json`
- `public/data/stocks/*.json`

### 3. 개발 서버 실행

```bash
npm run dev
```

## 사용 방법

### 조회 모드

1. 첫 화면에서 종목명 또는 티커를 입력합니다.
2. 검색 결과 중 하나를 선택합니다.
3. 선택한 종목의 현재가, 6개월 차트, 분기 실적, 지표를 확인합니다.
4. 필요하면 `직접입력으로 편집` 버튼으로 직접 입력 모드로 가져와 수정할 수 있습니다.

### 직접 입력 모드

1. 현재 주가를 입력합니다.
2. 분기 실적(매출액, 영업이익, 당기순이익)을 입력합니다.
3. 필요하면 고급 입력을 열어 아래 값을 입력합니다.
   - 시가총액
   - 주식수
   - 자본총계
   - 총부채
   - 현금성자산
   - EBITDA
4. `계산하기`를 누르면 연환산 / TTM 결과가 표시됩니다.

## 계산 기준

- EPS
  - 직접 입력 모드에서는 `순이익 / 주식수`로 계산
- BPS
  - `자본총계 / 주식수`
- PER
  - `주가 / EPS`
- PBR
  - `주가 / BPS`
- EV
  - `시가총액 + 총부채 - 현금성자산`
- EV/EBITDA
  - `EV / EBITDA`

### 연환산 방식

- 올해 누적 분기의 평균값을 4개 분기 기준으로 환산

### TTM 방식

- 최근 확정 4개 분기 합산 기준

## 테스트 및 검증

```bash
npm run lint
npm run test
npm run build
```

## 데이터 갱신 및 배포

### 일반 배포

- `main` 브랜치에 push 하면 `deploy.yml`이 실행됩니다.
- 이 과정에서:
  1. 의존성 설치
  2. `npm run data:fetch`
  3. `npm run build`
  4. GitHub Pages 배포

### 예약 데이터 갱신

- `update-data.yml`이 평일 기준 예약 실행됩니다.
- 수동 실행도 가능합니다.
- 데이터 재생성 후 GitHub Pages로 배포합니다.

## 참고 사항

- 데이터는 Yahoo Finance 기반으로 수집합니다.
- 일부 티커는 Yahoo 응답 제한 또는 404로 제외될 수 있습니다.
- `public/data/`는 생성 산출물이므로 `.gitignore`에 포함되어 있습니다.
- 조회 대상 종목을 바꾸고 싶다면 `scripts/tickers/us.json`, `scripts/tickers/kr.json`을 수정하면 됩니다.
