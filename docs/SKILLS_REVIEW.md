# SPORTON 개발 스킬 검토 및 적용

후속 상태: 사용자가 Hallmark를 명시해 기존 디자인을 유지하는 앱 범위의 보완에 추가 적용했다. 아래 최초 선택 기록과 구분한 결과는 [Hallmark 적용 보고서](HALLMARK_POLISH.md)를 참고한다.

제공된 이미지의 프로젝트 네 곳을 GitHub에서 직접 내려받아 README, SKILL.md, 설치 방식과 라이선스를 확인했다. 별 개수와 이미지 속 순위는 성능 근거로 사용하지 않았다. 이 보고서는 스킬 선택과 제한적인 UI 개선 결과이며, 전체 보안 감사나 배포 승인 보고서가 아니다.

## 선택과 기대 효과

| 프로젝트 | SPORTON 적합성 및 기대 효과 | 적용 |
| --- | --- | --- |
| [Hallmark](https://github.com/Nutlope/hallmark) | 재질·테마 중심의 새 화면 제작과 디자인 검사에 유용하다. 기존 스코어보드에서는 Impeccable과 역할이 겹치며, 새 테마 도입보다 사용자가 고른 화면의 가독성을 다듬는 것이 우선이다. | 보류 |
| [Impeccable](https://github.com/pbakaus/impeccable) | 작업형 대시보드의 계층·접근성·반응형 상태를 점검하고 제품 및 디자인 기준을 보존한다. 원본의 “The brief wins” 원칙에 따라 기존 차콜·글래스·라임·8px 간격을 유지할 수 있다. | 프로젝트 설치, 제한적 UI 점검과 개선에 사용 |
| [Cloudflare security-audit-skill](https://github.com/cloudflare/security-audit-skill) | API 입력, 외부 응답, 정적 파일 제공, Firebase 권한 등 신뢰 경계를 근거와 재검증 절차로 검토하는 데 적합하다. 설치만으로 방화벽이나 Firestore 규칙이 생기지는 않는다. | 프로젝트 설치, 향후 보안 작업의 지침으로 등록 |
| [ECC](https://github.com/affaan-m/ECC) | 변경 후 검증 절차를 일관되게 수행하는 데 유용하다. 전체 번들의 에이전트·기억 수집·훅·MCP는 현재 앱에 필요하지 않고 환경 변경 범위도 커진다. | `verification-loop`만 설치하고 이번 검증에 사용 |

품질 개선과 검토 누락 감소가 기대 효과다. 개발 속도, 결함 감소율, 사용자 전환율 등은 측정하지 않았으므로 향상 수치를 주장하지 않는다. Firebase 연결 및 스포츠 데이터의 외부 정확성은 별도의 설정과 증거가 필요하다.

## 검토한 원본과 고정 버전

아래 커밋은 이번 GitHub 조회 당시 각 저장소의 HEAD다. 추후 upstream 변경을 자동으로 가져오지 않는다.

| 프로젝트 | 커밋 | 라이선스 / 설치 원본 경로 |
| --- | --- | --- |
| Hallmark | [`4f6a46c6dc325d40ab268c93e25c7b96676ebccd`](https://github.com/Nutlope/hallmark/tree/4f6a46c6dc325d40ab268c93e25c7b96676ebccd) | MIT / 미설치 |
| Impeccable 4.8.0 | [`e89e3ada3e875a89ac2c5d33d11e65ebef6fe285`](https://github.com/pbakaus/impeccable/tree/e89e3ada3e875a89ac2c5d33d11e65ebef6fe285) | Apache-2.0 / `.agents/skills/impeccable` |
| Cloudflare | [`c1c8a8c1471069fb0e188eeaff69b8e8db6564a8`](https://github.com/cloudflare/security-audit-skill/tree/c1c8a8c1471069fb0e188eeaff69b8e8db6564a8) | MIT / `skills/security-audit` |
| ECC | [`b38be6a7f6350964d59328b52f0624e1d1d552d1`](https://github.com/affaan-m/ECC/tree/b38be6a7f6350964d59328b52f0624e1d1d552d1) | MIT / `skills/verification-loop` |

3개 스킬의 원본과 필요한 라이선스/NOTICE를 `.agents/skills/`에 보존했다. 총 88개 파일의 SHA-256, 저장소, 커밋, 원본 경로를 [skills-lock.json](../.agents/skills-lock.json)에 기록했다. `npm run skills:check`는 파일 변경·추가와 심볼릭 링크를 검사하며 CI에도 추가했다. 이 검사는 고정한 파일과의 일치를 확인하며, 코드 자체의 무해성을 증명하는 검사는 아니다.

전체 설치 스크립트, 전역 에이전트 설정, Git 훅, MCP, 자동 기억/관찰 수집은 실행하거나 등록하지 않았다. Impeccable의 실행기는 원본 체크섬 목록으로 엔진 다운로드를 검증한다. 실제 실행한 Linux x64 엔진은 0.1.18이며 SHA-256은 `736ed785e74ae2344d3036127f614ddde5ab520a527d8bc82a891612ef71f648`로 일치했다. 바이너리 캐시는 저장소 밖 `/workspace/.cache/impeccable`에 둔다.

## 실제 적용 결과

- [AGENTS.md](../AGENTS.md): 작업별 스킬 선택, 실제 검증 명령, 원본 보존과 데이터 관리 기준을 명시했다.
- [PRODUCT.md](../PRODUCT.md), [DESIGN.md](../DESIGN.md), [scoreboard.md](surfaces/scoreboard.md): 이미 합의한 제품 사실과 시각 기준을 기록했다. 새 디자인으로 교체하지 않았다.
- 승·무·패 배지에 독립적인 전경/배경 토큰을 적용했다. 어두운 패널용 보조 글자색이 밝은 배지 배경에 섞여 적용되던 문제를 수정했다.
- 정보가 없는 영문 장식 문구 두 곳을 제거해 실제 페이지 제목의 계층을 정리했다. 정적 자산과 서비스워커 캐시 버전도 갱신했다.

Playwright와 시스템 Chromium에서 저장된 K리그 순위표를 열어 실제 계산된 CSS 색으로 측정했다. 모바일 390px와 데스크톱 1440px에서 같은 결과였다.

| 배지 | 수정 전 대비 | 수정 후 대비 | 일반 텍스트 4.5:1 기준 |
| --- | --- | --- | --- |
| 무 | 1.82:1 | 8.30:1 | 통과 |
| 승 | 4.40:1 | 6.58:1 | 통과 |
| 패 | 5.00:1 | 5.00:1 | 통과 |

해당 화면에서 JavaScript 페이지 오류 및 문서 전체의 가로 넘침은 없었다. 외부 HTTPS 요청을 차단하고 로컬 수집본으로 확인했으므로 실제 로고 CDN 접근이나 현재 실시간 경기 연결의 증거는 아니다. 위 수치는 배지 세 종류에 대한 것으로 전체 페이지의 접근성 준수를 뜻하지 않는다.

## 검증과 남은 범위

| 단계 | 결과 |
| --- | --- |
| 저장소 기본 검사 `npm run check` | 통과, 테스트 65/65 |
| 스킬 무결성 `npm run skills:check` | 통과, 3개 스킬 / 88개 파일 |
| 무결성 검사 실패 경로 | 임시 사본에서 내용 변경·미등록 파일·심볼릭 링크 거부 확인 |
| 데이터 감사 `npm run data:audit` | 스키마 유효. 팀 ID 미확정 161행, 오래된 출처 32건은 계속 표시 |
| 빌드 / TypeScript / 별도 린터 | 이 저장소에 미설정. 해당 단계를 통과했다고 표시하지 않음 |
| 테스트 커버리지 | 측정하지 않음. ECC 예시의 80% 목표를 달성했다고 주장하지 않음 |
| 제한적 비밀키 패턴 검사 | 이번 작업의 프로젝트 파일 9개에서 네 종류의 키 패턴 일치 없음. 전체 저장소나 외부 설정의 안전성을 증명하지 않음 |
| 변경 검토 | 기존 작업을 보존하고 이번 변경 범위 확인. `git diff --check` 통과 |
| 전체 보안 감사 / 배포 환경 검증 | 수행하지 않음 |

Impeccable 수동 검출기는 편집 후 한 번 실행했다. `index.html`, `ai.html`, `score-center.css`, `football-standings.css`에서 127개 경고를 냈다: 대비 42, 작은 글자 11, 디자인 색상/반경 50, 여백 1, 스타일 패턴 23이다. 일부는 레거시 화면·숨은 상태·동적 화면 상태를 추가로 확인해야 하며, 사용자 참조의 배경 조명 등은 의도된 디자인이다. 경고를 모두 결함으로 확정하지 않았고, 무경고 상태나 전체 검토 완료도 주장하지 않는다. 원본 결과는 작업 환경의 `/workspace/artifacts/skills-review/impeccable-detect.json`에 보관했다. 추가 개선은 실제 표시 상태를 재현하고 우선순위를 정해 진행해야 한다.

Cloudflare의 전체 감사는 독립 검증과 실행 격리를 요구한다. 현재 환경에서 추가 격리를 위한 `bwrap --unshare-all` 사전 확인은 `setting up uid map: Read-only file system`으로 실패했다. 격리를 약화하거나 취약점 재현을 실행하지 않았다. 향후 소스 기반 검토는 가능하지만, 실행 증거가 필요한 감사는 해당 스킬의 격리 조건을 갖춘 환경에서 수행해야 한다. 이번 설치를 보안 취약점 수정이나 Firebase 보안 규칙 검증으로 해석하면 안 된다.

이미 알려진 데이터 미확정 상태는 [데이터 관리 기준](DATA_OPERATIONS.md)을 따른다. 스킬은 원본 팀 ID나 공식 로고를 대신 제공하지 않으며, 빈 정보를 임의 생성해서 경고를 없애지 않는다.

## 이후 사용 방법

UI 변경 시 Impeccable의 관련 참조만 읽고 기존 디자인에 맞게 사용한다. 보안 작업은 Cloudflare 지침을 선택해 범위를 선언하고, 전체 감사는 별도로 명시된 경우에 수행한다. 마무리에는 ECC verification-loop를 저장소의 실제 명령에 맞춰 실행하고 미설정·미검증 단계를 구분한다.

```sh
npm run check
npm run data:audit
npm run skills:check
```

원본 업데이트는 새 커밋의 변경·실행기·라이선스를 검토한 후 파일과 lock을 함께 갱신한다. 해시 오류를 없애기 위해 검토 없이 lock만 다시 생성하지 않는다.
