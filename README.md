# SPORTON — 국내·해외 경기 스코어보드

국내 KBO, K리그1·2, KBL, WKBL, V리그 남녀와 해외 ESPN 경기를 한국 시간으로 탐색합니다. 날짜·종목·지역·진행 상태·팀 검색·관심 경기를 제공합니다. 취소·연기·중단과 공급 오류를 경기 없음으로 처리하지 않습니다.

## 실행과 검증
Node.js 22 이상에서 실행합니다. 브라우저 배포 파일은 저장소에 포함되어 있습니다. UI 소스를 변경할 때는 고정된 의존성을 설치한 뒤 다시 빌드합니다.
```sh
npm ci --ignore-scripts
npm run build
node server/server.cjs
# http://localhost:4173
node --test tests/*.test.cjs
npm run check
```

## Astryx UI

[Meta Astryx](https://github.com/meta/astryx) 0.7.14의 실제 TextInput, Selector, Button, IconButton을 검색·리그/지역 필터·새로고침에 적용했습니다. 모바일 터치 환경에서는 리그 선택기가 하단 시트로 열립니다. 차콜/라임, 시간순 타임라인, 경기 자료는 유지합니다. 의존성·라이선스·빌드 경로는 [적용 기록](docs/ASTRYX_INTEGRATION.md)을 참고하세요.

## 팀과 기록 데이터 관리

팀 식별자·로고·시즌 전적은 [데이터 관리 기준](docs/DATA_OPERATIONS.md)에 따라 검증합니다. `npm run data:sync`로 관리 목록을 갱신하고 `npm run data:audit`로 출처·정합성과 미확정 정보를 확인합니다.

## 프로젝트 개발 스킬

GitHub 원본을 검토해 Impeccable, Cloudflare security-audit, ECC verification-loop를 프로젝트에 한정해 추가했습니다. 선택 이유·적용 결과·검증 한계는 [스킬 검토 보고서](docs/SKILLS_REVIEW.md), 작업별 사용 기준은 [AGENTS.md](AGENTS.md)를 참고하세요. 전역 훅·자동 기억 수집·MCP 설정은 설치하지 않습니다. `npm run skills:check`로 고정한 원본 파일의 무결성을 확인합니다.

## AI 분석 서비스 종료

사용자 요청으로 AI 분석 화면, 메뉴, 공개 자료 게시와 예약 파이프라인을 제거했습니다. 이전 개발용 엔진 및 저장 자료는 기존 기록 보존용이며 운영 사이트에서 제공하지 않습니다.

## 현재 운영 서버

`sporton.live`는 `https://sporton-live-api.parkbeomkuk.chatgpt.site`를 통해 국내·해외 데이터를 10초마다 조회합니다. API 서버는 Sites에서 실행되므로 개인 PC나 상시 실행 터미널이 필요하지 않습니다. 서버 캐시는 8초이고 동시 요청을 통합합니다. 해외 리그는 한 요청으로 묶고 원본 요청 동시성을 제한합니다. 원본 공급자 지연과 네트워크 시간을 포함한 10초 이내 반영을 보장하는 SLA는 아닙니다.

서버는 조회할 때 데이터를 가져옵니다. 별도 수집 예약이나 수동 갱신은 필요하지 않습니다. GitHub Actions 수집본은 API 장애 때의 보조 경로입니다. API 상태: `https://sporton-live-api.parkbeomkuk.chatgpt.site/api/health`. 정상 조회는 화면에 `10초마다 데이터 확인`, 장애 시에는 `수집본` 또는 `갱신 지연`이 표시됩니다. 장애 때 마지막 정상 점수를 보존하며 이를 새 실시간 기록으로 표시하지 않습니다.

관리: Sites에서 SPORTON Live Scores API를 확인합니다. 호스팅은 현재 베타 기간에 대상 ChatGPT 요금제에 포함되며 요금제별 사용량 한도가 있습니다(https://learn.chatgpt.com/docs/sites). 별도 스포츠 API 유료 구독은 설정하지 않았습니다. 원본 API 변경·사용량 제한·Sites 공개 호스팅 정책 변경 시 점검이 필요합니다. 공개 설정 파일에는 비밀키를 넣지 않습니다.

## 국내 데이터 연결

네이버 스포츠가 제공하는 경기 일정 JSON의 실제 응답을 확인했습니다. 제3자 공개 웹 엔드포인트로 SLA나 장기 호환성은 보장되지 않습니다. 운영 전 데이터 사용·재배포 조건을 확인하고, 규모가 커지면 K리그 공식 API 또는 계약된 공급자로 전환하십시오. 공식 K리그 API는 인증키와 파트너 접근 권한이 필요합니다: https://api.kleague.com/docs/index.jsp

### 1. Node 서버에서 사이트 전체 실행 (10초 확인)
`node server/server.cjs` 실행이 가능한 호스팅에 저장소를 배포합니다. `PORT` 환경변수를 지원합니다. 프런트엔드는 같은 서버의 `/api/domestic`과 `/api/overseas`에서 국내·해외 경기를 10초마다 확인합니다. ESPN도 브라우저 CORS 제한을 확인해 서버에서 조회합니다. 서버는 공급 요청을 8초 캐시·동시 요청 통합합니다. 실제 기록 지연은 공급자에 따라 달라집니다.

### 2. GitHub Pages 유지 + 별도 데이터 서버
위 서버를 배포한 뒤 `sporton-config.js`의 `domesticApiBase`에 HTTPS 서버 주소를 지정합니다. 서버의 `ALLOWED_ORIGINS` 기본값은 `https://sporton.live`입니다. 여러 도메인은 쉼표로 구분합니다. 외부 API 키는 이 공개 설정 파일에 넣지 마세요.

### 3. 서버 없이 GitHub Pages에서 주기 수집본 사용
`Collect Korean scores` 워크플로가 기본 브랜치에 들어가면 GitHub Actions에서 약 5분 간격으로 국내·해외 데이터를 수집해 `data/domestic/YYYY-MM-DD.json`과 `data/overseas/YYYY-MM-DD.json`을 커밋합니다. 어제부터 6일 뒤까지 조회 가능하며, 7일보다 오래된 파일은 정리합니다. Actions 예약 실행은 지연될 수 있고 장기간 비활성 저장소에서는 중단될 수 있습니다. 이 방식은 10초 실시간 중계가 아니며 화면에 수집본·수집 시간·갱신 지연을 표시합니다.

저장소 Settings → Pages → Source를 GitHub Actions로 설정합니다. 포함된 Deploy score site 워크플로가 main 코드 변경과 국내 수집 작업 완료 후 공개 파일만 배포합니다. Actions 토큰 커밋이 push 이벤트를 만들지 않는 문제는 workflow_run으로 처리합니다. 배포 후 Actions/Pages 기록과 실제 JSON 변경 반영을 확인하세요. GitHub 설정에서 Actions의 콘텐츠 쓰기 권한이 필요할 수 있습니다. 수동 실행도 가능합니다.

수집 검증:
```sh
node scripts/collect-domestic.cjs
# 과거 실제 데이터 테스트 (운영 data 폴더를 갱신하므로 테스트 사본에서 실행)
SCORE_DATE=2025-05-01 node scripts/collect-domestic.cjs
```

## 화면 구성과 운영 설정

`app.js`는 화면 전환·종목 선택·알림만 맡는 작은 셸이고, 점수 조회와 렌더링은 `score-center.js`가 담당합니다. 해외 팀 한글 표기는 `korean-names.js`에 있습니다. 예전 커뮤니티·채팅·관리자·배당 화면과 Firebase/Font Awesome 의존성은 2026-11-17 릴리스에서 제거했습니다(`docs/SHELL_CLEANUP.md`).

주요 리그(유럽 5대 리그·챔피언스리그)는 목록 위쪽 `주요 리그` 구역과 리그 칩으로 먼저 보입니다(`?league=major`로 공유 가능). 배당 정보는 다루지 않습니다.

JS/CSS를 수정하면 `npm run release:stamp`로 `?v=` 버전을 올려야 합니다. 버전이 붙은 파일은 1년간 캐시되므로, 올리지 않으면 `npm run check`가 실패합니다. 화면 전환·뒤로가기 동작은 `npm run e2e`(브라우저 점검)로 확인합니다. 보안 정책(CSP)의 원본은 `index.html`의 meta 태그이며, 서버와 `_headers`는 이를 따르고 테스트가 일치 여부를 검사합니다.

점수 서버가 프록시나 CDN 뒤에서 동작하면 `TRUST_PROXY_HOPS=1`(프록시 수)을 설정해야 방문자별 요청 제한이 프록시 주소 하나로 합쳐지지 않습니다. 보안 헤더와 CSP는 `server/server.cjs`, 정적 호스팅용 `_headers`, `index.html`의 meta 태그에 같은 정책으로 들어 있습니다.

## 검증과 데이터 정확성

- KST 자정·연말 경계, 취소·중단·알 수 없는 상태, 예정 경기 0-0 오표시, 필터 조합, 공급 실패·빈 일정 구분을 테스트합니다.
- 점수 데이터 API와 수집 JSON은 서비스워커 캐시에서 제외합니다. 정적 화면도 네트워크 우선입니다.
- 실패 시 마지막 정상 기록과 원래 수집 시각을 유지하고 지연 표시를 합니다. 실제 확인되지 않은 경기·스코어는 생성하지 않습니다.
- 국내 상세 화면은 확인된 점수·상태와 네이버 문자 중계 링크를 제공합니다. 타 공급자의 해외 상세 API로 국내 경기 ID를 보내지 않습니다.
