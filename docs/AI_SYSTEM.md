# SPORTON AI 분석 엔진

## 구현 범위

기존 스코어보드와 분리된 `ai-engine/` 모듈이다. 현재 구현은 검증 가능한 경기 일정·결과를 저장하고, 리그별 Elo/득점분포 기준 모델을 시간순으로 학습·검증하며, 경기 전 예측을 불변 기록으로 남기고 경기 종료 후 자동 채점한다.

현재 구현된 단계:

1. 기존 구조·배포·테스트 기준선 조사
2. KBL/NBA 공급원 및 이용 제한 조사
3. SQLite 스키마와 마이그레이션
4. 기존 Naver/ESPN 정규화 결과를 재사용한 KBL/NBA 경기 수집
5. 실제 수집 가능한 경기 일정·결과 적재
6. 리그별 Elo + 득점분포 baseline
7. 시간순 expanding-window backtest
8. 딥러닝은 표본과 비교 우위가 없어 미구현
9. 읽기 전용 AI API
10. 기존 디자인을 따르는 AI 상태·예측 화면
11. 불변 예측 자동 채점, 후보 모델 검증 후에만 승격
12. 회귀·데이터 누수·불변성 테스트와 개발용 예약 워크플로

LightGBM/XGBoost/MLP, 선수·라인업 고급 데이터, 운영용 영속 DB, 운영 API 배포는 아직 완료되지 않았다. 데이터나 권리가 없는 상태에서 숫자를 만들지 않는다.

## 구성 요소와 흐름

```text
Naver KBL / ESPN NBA        Licensed odds (optional)
          |                           |
          v                           v
  normalized score feeds       odds_snapshots
          |                           |
          +------> SQLite <-----------+
                    |
          completed games (time ordered)
                    |
             walk-forward backtest
                    |
          candidate model evaluation
                    |
        promote only when demonstrably better
                    |
     pregame feature snapshot -> immutable prediction
                    |
         final result -> prediction_results
                    |
          read-only API -> AI dashboard
```

`feature_snapshots.cutoff_at`은 경기 시작 전이어야 하며 예측은 생성 후 수정·삭제할 수 없다. 운영 추천은 시장 데이터가 없거나, 부상 데이터가 없거나, 마진 제거 후 Edge가 기준 미만이면 `PASS`다.

## 저장 구조

요구된 `leagues`, `seasons`, `teams`, `players`, `games`, `team_game_stats`, `player_game_stats`, `lineups`, `injuries`, `odds_snapshots`, `feature_snapshots`, `model_versions`, `training_runs`, `predictions`, `prediction_results`, `backtest_runs`, `pipeline_runs`를 모두 생성한다.

추가로 다음을 관리한다.

- `data_sources`: 출처 등급, 활성 조건, 약관, 확인 시각
- `season_rules`: KBL 시즌별 외국인 출전 규정
- `data_revisions`: 경기 결과 정정 이력
- `schema_migrations`: 마이그레이션 이력

기본 DB는 `.sporton/ai.sqlite`이며 Git에 포함하지 않는다. 운영에서는 `AI_DB_PATH`를 영속 볼륨으로 지정해야 한다.

## 실행

```sh
cp .env.example .env
npm run ai:migrate
npm run ai:collect -- --from 2026-10-16 --to 2026-10-17
npm run ai:train
npm run ai:backtest
npm run ai:predict -- --date 2026-10-17
npm run ai:score
npm run ai:daily
npm run check
```

`ODDS_API_KEY`가 없으면 배당 수집은 실패가 아니라 `DATA_UNAVAILABLE`로 기록한다. KBL 배당 공급원은 아직 승인되지 않았으므로 생성하지 않는다.

## API

- `GET /api/ai/status`: 리그별 적재·모델 상태, 공급원 활성 조건, 최근 파이프라인
- `GET /api/ai/predictions?league=kbl&date=YYYY-MM-DD`
- `GET /api/ai/performance`

모두 읽기 전용이다. API 키, 원본 자격증명, 내부 DB 경로는 응답에 포함하지 않는다.

## 자동화와 배포 제약

`.github/workflows/ai-pipeline.yml`은 6시간마다 실제 결과 수집, 채점, 재학습 필요성 평가, 후보 모델 검증, 예측 생성을 실행한다. Actions 캐시와 30일 artifact는 개발 검증용이다. 캐시는 운영 데이터베이스나 백업을 대신하지 않는다.

현재 `sporton.live`는 GitHub Pages이고 API는 별도 Sites Worker이므로, 로컬 SQLite 파일이 Pages에 배포되지는 않는다. AI API를 운영하려면 영속 DB를 제공하는 서버에 변경된 Node 서버를 배포하고 백업·복구를 구성해야 한다.

## 모델 승격 원칙

- 동일 리그, 시간순 데이터로 검증한다.
- 첫 모델 외에는 검증 표본 20경기 이상이며 Brier Score가 운영 모델보다 좋아야 승격한다.
- 새 완료 경기가 없으면 재학습하지 않는다.
- 한 경기 실패로 가중치를 변경하지 않는다.
- 기존 모델 버전과 학습 실행 이력을 삭제하지 않는다.
- ROI/CLV는 경기 전 실제 과거 배당이 없으면 계산하지 않는다.

## 다음 우선순위

1. 계약/약관이 확인된 KBL·NBA 고급 팀/선수/라인업 공급자 연결
2. NBA 공식 부상 리포트의 허용된 수집 방식과 KBL 부상 공급원 확정
3. KBL 포함 과거 배당 라이선스 확보 및 마감선 수집
4. 실제 영속 DB(PostgreSQL 권장)와 비밀 관리, 백업, 운영 API 배포
5. 두 시즌 이상 데이터 확보 후 LightGBM/XGBoost를 동일 walk-forward 기준으로 비교
6. 쿼터 모델은 쿼터·라인업 표본이 충분한 경우에만 활성화
