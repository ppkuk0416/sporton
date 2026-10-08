# SPORTON — 국내·해외 경기 스코어보드

국내 KBO, K리그1·2, KBL, WKBL, V리그 남녀와 해외 ESPN 경기를 한국 시간으로 탐색합니다. 날짜·종목·지역·진행 상태·팀 검색·관심 경기를 제공합니다. 취소·연기·중단과 공급 오류를 경기 없음으로 처리하지 않습니다.

## 실행과 검증
Node.js 22 이상, 외부 패키지 없이 실행합니다.
```sh
node server/server.cjs
# http://localhost:4173
node --test tests/*.test.cjs
npm run check
```

## 국내 데이터 연결

네이버 스포츠가 제공하는 경기 일정 JSON의 실제 응답을 확인했습니다. 제3자 공개 웹 엔드포인트로 SLA나 장기 호환성은 보장되지 않습니다. 운영 전 데이터 사용·재배포 조건을 확인하고, 규모가 커지면 K리그 공식 API 또는 계약된 공급자로 전환하십시오. 공식 K리그 API는 인증키와 파트너 접근 권한이 필요합니다: https://api.kleague.com/docs/index.jsp

### 1. Node 서버에서 사이트 전체 실행 (30초 확인)
`node server/server.cjs` 실행이 가능한 호스팅에 저장소를 배포합니다. `PORT` 환경변수를 지원합니다. 프런트엔드는 같은 서버의 `/api/domestic`과 `/api/overseas`에서 국내·해외 경기를 30초마다 확인합니다. ESPN도 브라우저 CORS 제한을 확인해 서버에서 조회합니다. 서버는 공급 요청을 20초 캐시·동시 요청 통합합니다. 실제 기록 지연은 공급자에 따라 달라집니다.

### 2. GitHub Pages 유지 + 별도 데이터 서버
위 서버를 배포한 뒤 `sporton-config.js`의 `domesticApiBase`에 HTTPS 서버 주소를 지정합니다. 서버의 `ALLOWED_ORIGINS` 기본값은 `https://sporton.live`입니다. 여러 도메인은 쉼표로 구분합니다. 외부 API 키는 이 공개 설정 파일에 넣지 마세요.

### 3. 서버 없이 GitHub Pages에서 주기 수집본 사용
`Collect Korean scores` 워크플로가 기본 브랜치에 들어가면 GitHub Actions에서 약 5분 간격으로 국내·해외 데이터를 수집해 `data/domestic/YYYY-MM-DD.json`과 `data/overseas/YYYY-MM-DD.json`을 커밋합니다. 어제부터 6일 뒤까지 조회 가능하며, 7일보다 오래된 파일은 정리합니다. Actions 예약 실행은 지연될 수 있고 장기간 비활성 저장소에서는 중단될 수 있습니다. 이 방식은 30초 실시간 중계가 아니며 화면에 수집본·수집 시간·갱신 지연을 표시합니다.

저장소 Settings → Pages → Source를 GitHub Actions로 설정합니다. 포함된 Deploy score site 워크플로가 main 코드 변경과 국내 수집 작업 완료 후 공개 파일만 배포합니다. Actions 토큰 커밋이 push 이벤트를 만들지 않는 문제는 workflow_run으로 처리합니다. 배포 후 Actions/Pages 기록과 실제 JSON 변경 반영을 확인하세요. GitHub 설정에서 Actions의 콘텐츠 쓰기 권한이 필요할 수 있습니다. 수동 실행도 가능합니다.

수집 검증:
```sh
node scripts/collect-domestic.cjs
# 과거 실제 데이터 테스트 (운영 data 폴더를 갱신하므로 테스트 사본에서 실행)
SCORE_DATE=2025-05-01 node scripts/collect-domestic.cjs
```

## Firebase와 관리자

공통 Firebase 웹앱 설정은 `sporton-config.js`의 `firebase`에 지정합니다. 서비스계정·비밀키는 넣지 않습니다. Firestore 보안 규칙, 사용자 인증, 메시지 제한은 서버/프로젝트에 별도 설정해야 합니다. 설정이 없으면 채팅이 연결되지 않으며 스코어보드는 독립적으로 동작합니다.

공개 비밀번호와 localStorage로 관리자 권한을 판단하던 방식은 비활성화했습니다. 운영자 관리 기능은 실제 인증·권한 검증을 구현한 후 활성화해야 합니다.

## 검증과 데이터 정확성

- KST 자정·연말 경계, 취소·중단·알 수 없는 상태, 예정 경기 0-0 오표시, 필터 조합, 공급 실패·빈 일정 구분을 테스트합니다.
- 점수 데이터 API와 수집 JSON은 서비스워커 캐시에서 제외합니다. 정적 화면도 네트워크 우선입니다.
- 실패 시 마지막 정상 기록과 원래 수집 시각을 유지하고 지연 표시를 합니다. 실제 확인되지 않은 경기·스코어는 생성하지 않습니다.
- 국내 상세 화면은 확인된 점수·상태와 네이버 문자 중계 링크를 제공합니다. 타 공급자의 해외 상세 API로 국내 경기 ID를 보내지 않습니다.
