# 데이터 공급원 검토 기록

확인일: 2026-10-17. 공급원 상태는 `ai-engine/source-registry.json`과 DB의 `data_sources`에 함께 기록한다.

## 사용 중

### KBL 일정·결과

- 현재 코드가 이미 사용하는 Naver Sports 일정 응답을 KBL 경기 ID, 시작 시각, 상태, 최종 점수 수집에 재사용한다.
- 공식 계약이나 SLA가 없는 공개 웹 응답이다. 고급 기록이나 장기 재배포 권리를 뜻하지 않는다.
- 실패 시 기존 SPORTON 스코어보드는 그대로 동작하고 AI 수집 실행만 실패/부분 성공으로 기록한다.

### NBA 일정·결과

- 현재 코드가 이미 사용하는 ESPN Scoreboard 응답을 일정·상태·점수에 재사용한다.
- NBA 공식 고급 통계 공급원으로 간주하지 않는다.

### KBL 2026–27 외국선수 규정

- [KBL 공식 선수선발 및 출전규정](https://www.kbl.or.kr/rule/player)에서 1·4쿼터 1명, 2·3쿼터 2명 출전을 확인했다.
- 값은 코드 상수가 아니라 `season_rules`에 시즌별 JSON으로 저장한다.

## 승인 또는 자격증명 필요

### NBA Stats

- [NBA.com 이용약관](https://www.nba.com/termsofuse)의 NBA Statistics 조항은 도박 활동 연계와 종합·정기 갱신 통계 DB 이용을 제한한다.
- [NBA Stats FAQ](https://www.nba.com/stats/help/faq)는 통계를 다운로드용으로 제공하지 않는다고 명시한다.
- 따라서 명시적 라이선스/권리 확인 전 자동 수집하지 않으며 ORtg, DRtg, lineup NetRtg, on/off 등은 `DATA_UNAVAILABLE`이다.

### NBA 부상 리포트

- NBA의 공식 부상 리포트는 공식 사이트/PDF로 게시되지만 자동 수집·재배포 권리를 확인한 뒤 연결한다.
- 미연결 상태에서는 핵심 선수 출전 불확실성을 해소할 수 없으므로 공식 추천은 `PASS`한다.

### 시장 배당

- 구현된 선택 공급자는 [The Odds API v4](https://the-odds-api.com/liveapi/guides/v4/)이며 키를 `ODDS_API_KEY` 환경변수로만 읽는다.
- NBA moneyline/spread/total의 경기 전 snapshot만 저장한다. 키가 없으면 수집하지 않는다.
- 과거 snapshot은 유료 플랜이 필요하므로 실제 과거 배당이 없으면 ROI/CLV를 계산하지 않는다.
- KBL 커버리지는 확인되지 않아 비활성 상태다.

## 데이터 품질 규칙

- 각 레코드에 공급원과 수집 시각을 저장한다.
- 경기 ID는 `(source_id, provider_game_id)`로 중복을 막는다.
- 수정된 최종 점수는 덮어쓰기 전에 `data_revisions`에 이전/이후 값을 기록한다.
- 예정 경기 점수, 부상, 라인업, 배당, 고급 통계를 추정해서 채우지 않는다.
- NBA 프리시즌/정규시즌 구분이 공급 응답에서 검증되지 않으면 `competition_phase=DATA_UNAVAILABLE`로 둔다.
