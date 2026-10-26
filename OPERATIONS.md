# SPORTON 운영 · 복구

## 현재 구성
- 화면: https://sporton.live, GitHub Pages.
- 점수·상세 API: https://sporton-live-api.parkbeomkuk.chatgpt.site, Sites Worker v5, release 20261013-priorities8.
- 진행 경기 5초, 그 외 10초 조회. API 원본 캐시 4초. 해외 전체 수집 단계 공통 예산 6초, 요청당 원본 최대 4개 동시 조회. 네트워크 전송과 원본 갱신 시간은 별도입니다.
- 국내 네이버 스포츠, 해외 ESPN 공개 응답에 의존합니다. 공개 응답 형식·접근·재사용 허용의 지속성은 보장하지 않습니다. 공식 데이터 계약은 아직 없습니다.
- GitHub Actions 보조 기록은 5분 주기로 예약되어 있지만 실제 실행·배포는 지연될 수 있습니다. 화면에서는 최신 점수와 마지막 확인 점수를 구분합니다.

## 내 경기판
목록의 고정 버튼으로 최대 4경기를 등록합니다. 관심 팀/경기와 독립적이며 브라우저에 리그·경기 ID·날짜만 저장합니다. 점수 자체는 저장하지 않습니다. 목록 필터와 다른 고정 경기가 있으면 공용 API 조회 범위를 넓혀 함께 갱신합니다. 날짜를 바꾼 경우 다른 날짜 점수를 현재 점수처럼 재사용하지 않습니다. 고정 경기가 없으면 빈 경기판은 숨깁니다.

## 국내 상세 정보
- KBO 이닝과 안타·실책·볼넷.
- KBL 쿼터와 리바운드·어시스트·스틸·블록·턴오버. 선택 기록 API 실패 시 기본 쿼터 기록만 유지합니다.
- K리그 제공된 득점·카드와 슈팅·점유율·코너킥·파울·오프사이드.
- V리그 세트별 점수와 공격·블로킹·서브·범실. 세트 점수와 획득 세트 합계를 구분합니다.
없는 통계는 생성하지 않습니다. 아직 진행하지 않은 구간은 —이며 실제 0점과 구분합니다. 2026-10-10/11 실제 응답 fixture로 검증했고, WKBL·남자배구 실제 기록 검증은 해당 기간 경기가 없어 아직 하지 못했습니다.

## 경기 알림 범위
- 기본 꺼짐, 고정 경기만 대상. 사용자가 켠 뒤 정상 API 점수의 변경·정정·시작·종료를 관찰합니다.
- 처음 관찰, 오래된 기록, 마지막 확인 점수, 연결 복구, 20초 이상 관찰 공백 이후에는 기준을 다시 잡고 과거 변화를 새 이벤트로 알리지 않습니다.
- 화면 알림과 선택적인 브라우저 알림을 지원합니다. 브라우저 권한은 사용자의 허용 버튼 클릭에서만 요청합니다.
- **페이지를 닫으면 알림이 중지됩니다.** 서버 기반 푸시는 구현하지 않았습니다. 열린 백그라운드 탭에서도 조회를 시도하지만 브라우저 절전·타이머 제한으로 지연되거나 중지될 수 있습니다.

## 정확성과 진단
진행 경기 수집 시각이 20초, 비진행이 2분, 보조 기록이 10분을 넘으면 지연으로 표시합니다. 원본 캐시를 읽을 때 수집 시각을 새로 만들지 않습니다. 수집 시각은 경기장 이벤트 시각이나 제공처 점수 갱신 시각과 다릅니다.
개발자 콘솔의 SportonDiagnostics.summary()는 현재 열린 페이지의 최대 200개 요청을 집계합니다. 요청별 실패, 부분 공급 실패, 응답 시간 p50/p95, 가장 오래된 수집 시각의 나이를 제공합니다. 개인정보·검색어·URL 쿼리를 저장하거나 외부 분석 서비스로 전송하지 않습니다. 장기 운영 통계나 경기장 대비 지연 실측을 대신하지 않습니다.

## 장애·배포 확인
1. 화면의 마지막 확인 시각과 지연 안내를 확인하고 새로고침합니다.
2. /api/health의 HTTP 200과 release를 확인합니다. health 정상은 제공처 정상 보장이 아닙니다.
3. /api/domestic과 /api/overseas의 리그별 state/fetchedAt/matches를 확인합니다. 실패 코드가 있으면 HTTP 공급 오류·타임아웃·형식 오류·런타임/네트워크 오류를 구분합니다.
4. API는 Sites 소스를 먼저 push하고 동일 소스에서 빌드한 아카이브로 버전 저장 후 배포합니다. 공통 정규화 형식 변경은 API 호환 배포 후 화면을 배포합니다.
5. Pages 사용자 정의 배포 작업은 같은 체크아웃의 문법·회귀 테스트가 성공해야 업로드합니다. 웹 롤백은 해당 변경 revert, API 롤백은 이전 저장 버전 재배포입니다.

## 남은 운영 한계
CORS는 사용자 인증이 아닙니다. IP 제한과 캐시는 Worker 인스턴스 단위이며 전역 부하/비용 상한을 검증하지 않았습니다. 제공처 지연·누락·차단, 무중단, 점수의 완전성은 보장하지 않습니다. 계정·글쓰기·관리자 기능을 공개하려면 서버 인증·권한·저장소 규칙·남용 방지가 먼저 필요합니다. 현재 관심 정보는 기기 간 동기화되지 않습니다.

## AI 분석 운영

### 사용자 운영 점검 (2026-10-21)

- 공개 AI 화면은 베타로 표시한다. 경기 일정·결과는 기존 점수 API와 정적 수집본으로 제공하고, 분석 자료는 검증 스냅샷의 실제 갱신 시간을 표시한다.
- `SPORTON production health`가 매시간 및 배포 완료 후 공개 페이지, API, 12시간 이내 AI 갱신, 잘못된 날짜 및 Origin 차단을 검사한다. 실패는 GitHub Actions 실패로 기록된다. 저장소 소유자의 Actions 알림 수신 설정은 별도 확인이 필요하다.
- 수동 확인: `node scripts/production-check.cjs`. 예측이 없거나 배당 키가 없는 상태 자체는 장애가 아니다.
- AI 수집이 실패 또는 부분 성공하면 새 공개 스냅샷 발행을 중단한다. DB 캐시와 30일 artifact는 실패 때도 보존을 시도한다. 마지막 정상 스냅샷은 유지되며, 화면과 정기 점검이 갱신 지연을 드러낸다.
- 장애 대응: Actions의 실패 step 확인 → 공급원 정상화 확인 → AI 파이프라인 재실행 → Pages 배포 완료 → production health 성공 확인. 이전 UI 복구는 문제 코드 커밋만 revert하고 자동 수집 데이터는 보존한다.
- 공개 예측에는 완료 경기 최소 기준 외에 최소 20경기 시간순 검증이 필요하다. 유료 배당·부상·라인업 연결 및 영속 운영 DB 전환은 아직 미완료다. 모델이 준비돼도 데이터가 부족하면 판단 보류를 유지한다.
- 오류 제보는 공개 GitHub Issue로 받으며 개인정보·자격증명 입력을 금지한다.

- 로컬 기본 저장소는 `.sporton/ai.sqlite`이며 Git에서 제외된다. 운영에서는 `AI_DB_PATH`를 영속 볼륨에 지정하고 별도 백업이 필요하다.
- `npm run ai:daily`는 전후 1일 수집, 종료 경기 채점, 신규 완료 경기 존재 시 후보 재학습, 검증 우수 시에만 승격, 당일 예측을 순서대로 실행한다.
- `ODDS_API_KEY`는 서버/Actions secret으로만 제공한다. 브라우저 설정이나 `sporton-config.js`에 넣지 않는다.
- Actions의 AI DB 캐시와 30일 artifact는 개발 검증용이며 운영 DB/백업이 아니다.
- 현재 Pages와 운영 Sites API는 공개 검증 스냅샷을 사용하며 영속 AI DB는 연결되지 않았다. 공개 화면은 학습·성능 검증이 완료될 때까지 분석 준비 상태를 표시한다.

## GitHub 설정 확인이 남은 항목
기본 pages build and deployment와 사용자 정의 Deploy score site가 함께 실행되는 이력이 있습니다. 기본 경로가 검증을 우회할 가능성이 있으므로 Settings → Pages → Build and deployment → Source를 GitHub Actions로 통일해야 합니다. 브라우저 주소를 확실하게 확인할 수 없어 Computer Use가 정책상 중단되어 UI 변경을 완료하지 못했습니다. 제공된 GitHub 연결 도구도 Pages 관리자 설정을 지원하지 않습니다. 이 설정은 사용자 확인이 남아 있으며 모든 배포 경로의 검증 강제를 보장하지 않습니다.


## Football standings (2026-10-26)

- Home → 축구 → 리그 순위표 lists every soccer league from sports-core.js, filtered by the selected region. The match date does not change current-season standings.
- K League 1/2: provider season metadata selects the current enabled season; provider split groups and ranks are retained. scripts/collect-standings.cjs runs in the existing 5-minute collector, including push-triggered refresh. GitHub scheduling/build/publishing may add delay.
- Overseas: the browser-accessible site.web.api.espn.com standings endpoint is queried on demand and every 60 seconds while the table is visible. Only the selected league is queried. Manual refresh skips the one-minute browser memo.
- data/standings contains an eight-league fallback, refreshed by the collector. Original fetchedAt is retained on collection failure; stale data is labeled. A source query timestamp is not the time of the latest goal or an instant live ranking guarantee.
- Supply rank, points and group order are displayed without guessing qualification/relegation zones. Missing numbers remain —.
- New football assets are included in Pages packaging and the versioned offline shell; live standings JSON is excluded from service-worker storage. No Firebase or new API server deployment is needed for this feature.
