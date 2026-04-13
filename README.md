# Stock Calc (Mobile Web)

React + TypeScript + Vite 기반 모바일 주식 조회/계산기입니다.

## 주요 기능

- 회사명/티커 검색 후 종목 선택
- 선택 종목 일단위(6개월) 차트 + 현재가 표시
- EPS, BPS, PER, PBR, EV/EBITDA 표시
- 작년/올해 1~4분기 실적(매출액/영업이익/당기순이익) 표시
- 연환산 방식과 TTM 방식으로 EPS/PER/PBR/EV-EBITDA 계산
- 직접 입력 모드(기본 입력 + 선택 고급 입력)
- 한국어/영어 UI 토글
- API 호출 캐시/재시도/에러 배너 제공

## 개발 실행

```bash
npm install
npm run dev
```

## 테스트 / 빌드

```bash
npm run test
npm run build
```

## GitHub Pages 배포

- `.github/workflows/deploy.yml` 포함
- `main` 브랜치 push 시 Pages 자동 배포
- Vite `base`는 상대 경로(`./`)로 설정되어 하위 경로에서도 동작합니다.

## 데이터 소스 참고

- Yahoo 공개 엔드포인트를 프론트에서 직접 호출합니다.
- 무료/무키 접근 특성상 `429`가 발생할 수 있어 재시도 로직을 적용했습니다.

