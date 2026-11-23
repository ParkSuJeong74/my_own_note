# EasyOpen Account Server (NestJS + TypeORM)

Node **22.23.5**, NestJS 11, TypeORM 0.3, PostgreSQL 16.16. 인증/회원/기기 연결/관리자/결제 계약을 담당한다. 결제 공급자 미설정 503, 미구현 공급자 501 상태를 유지하며 실제 결제나 유료 로컬 모듈 활성화를 만들지 않는다. 무료 기기 기능은 계정 서버와 독립이다.

## 구조

- `auth`: Google OAuth, 기존 서명 cookie, 로그인/로그아웃, 관리자 allowlist.
- `accounts`: 회원·권한·감사 이벤트의 Repository와 TypeORM transaction.
- `device`: 10분 연결 요청/브라우저 승인/일회 교환/7일 Bearer 세션. 교환의 PostgreSQL row lock은 TypeORM QueryRunner로 같은 트랜잭션에 유지한다.
- `billing`: 공급자 연동 전 fail-closed API.
- `database`: 기존 이름과 일치하는 EntitySchema 7개, DataSource, migration history/runner.

기존 `/v1` 경로, JSON 상태, cookie 이름/issuer/audience/서명 secret을 유지한다. 브라우저 cookie·native Bearer·관리자 권한은 서로 대체되지 않는다. 사용자/토큰/SQL 파라미터를 요청 로그에 출력하지 않는다. `synchronize:false`, `migrationsRun:false`를 고정한다.

## 환경

Compose가 기존 Doppler 변수명을 그대로 사용한다. API/Admin origin은 `https://easyopen-api.mano.io.kr`, Web origin은 `https://easy-open.mano.io.kr`. `EASYOPEN_GOOGLE_CLIENT_ID`, `EASYOPEN_GOOGLE_CLIENT_SECRET`, `EASYOPEN_SESSION_SECRET` (32자 이상), `EASYOPEN_ADMIN_EMAILS`, `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`가 필요하다. secret 변경은 기존 로그인 무효화에 영향을 주므로 이전 과정에서 바꾸지 않는다. `PORT=3001`, `HOSTNAME=0.0.0.0`.

## Migration과 데이터 보존

`npm run build && npm run migration:run`은 compiled TypeORM migration을 실행한다. `easyopen_migrations`에 적용 이력을 기록하고 PostgreSQL advisory lock으로 동시 배포를 직렬화한다. 전체 pending migration은 한 transaction이다.

- 빈 DB: 기존 테이블과 기기 테이블을 생성한다.
- 기존 001 SQL만 적용된 DB: 기존 회원/권한을 보존하고 기기 테이블을 추가한다.
- 기존 001+002 SQL DB: IF NOT EXISTS로 기존 스키마를 보존하고 migration history를 baseline한다.
- 재실행: 적용 이력에 있는 migration은 건너뛴다.
- 호환되지 않는 기존 스키마: 실패하며 중간 migration을 기록/부분 적용하지 않는다. 기존 스키마를 검사해 수동 보정한 뒤 재시도한다.

운영 배포는 별도 사용자 승인/실행이며 이번 작업에서 DB에 접속하거나 migration을 실행하지 않았다. 향후 승인된 홈서버 배포 경로는 다음 순서다.

1. DB 백업과 기존 web/server 이미지·SHA 확보.
2. NestJS와 Next.js 이미지 빌드.
3. 기존 PostgreSQL ready 확인.
4. `docker compose run --rm --no-deps easyopen-server npm run migration:run`을 기존 Doppler 주입으로 실행.
5. 성공한 경우에만 NestJS·Next.js를 교체하고 두 health가 정상인지 확인.
6. 성공 후에만 EasyOpen 배포 fingerprint 저장. 실패한 배포는 다음 실행에서 다시 시도한다.

원격 DB/secret/터널 설정은 자동 변경하지 않는다. loopback 3200 및 공개 origin은 유지하고 backend에는 호스트 port를 게시하지 않는다. NestJS는 Google 접속을 위해 기존 proxy 네트워크에도 연결한다.

롤백은 이전 앱 이미지/SHA로 수행하고 기존 DB와 새 additive 테이블을 유지한다. 자동 migration down/volume 삭제를 금지한다. 기존 초기화 SQL 파일을 다시 수동 적용할 필요는 없다.

## 검증

```sh
npm ci
npm run build
npm test
npm run typecheck
# ../api의 Next production build가 먼저 필요하다.
EASYOPEN_DOCKER_QA=1 npm run verify:integration
```

통합 QA는 Compose와 동일한 PostgreSQL digest가 로컬 cache에 있어야 한다. 별도 label/이름/port/container를 사용한다. 빈 DB·동시 migration·migration 실패 transaction·기존 회원 보존·재실행, ORM 회원 upsert/권한 부여·회수/audit 및 실패 rollback, Next proxy/SSR, OAuth 진입·거절·안전 복귀/쿠키, 승인 CSRF·일회 교환·만료·세션 폐기를 확인하고 시험 자원만 정리한다. Google 실제 토큰 교환, 운영 반영과 앱 실기기 왕복은 별도 QA다. 테스트 port 3001/4284가 사용 중이면 먼저 확인한다.

검증 환경: PostgreSQL 16.16 / Node 22.23.5. npm audit에서 TypeORM의 glob/minimatch CLI 의존성에 moderate 3건이 남아 있다. 자동 patch 수정으로 해소되지 않았으며, 런타임 엔티티·migration은 사용자 입력 glob 없이 명시 배열을 사용한다. 호환 버전 업데이트를 추적한다.

Docker 실행 검증은 저장소 루트에서 `docker build -t easyopen-account-server:qa easyopen/apps/server`, `docker build -t easyopen-account-web:qa easyopen/apps/api` 후 서버 경로에서 `EASYOPEN_DOCKER_QA=1 node scripts/verify-containers.mjs`로 수행한다. 임시 network/DB/server/web을 만들고 읽기 전용 파일시스템·migration·프록시·SSR·기기 요청 및 웹 secret 부재를 확인한다. 테스트 자원은 label 소유 확인 후 정리하며 QA 이미지만 cache에 남긴다.

### 배포 중 코드 점검 보완

DB 접속은 PGHOST/PGUSER/PGPASSWORD/PGDATABASE가 명시되어야 하며 누락 시 PostgreSQL의 기본 로컬 접속으로 fallback하지 않는다. PGPORT는 1~65535 정수만 허용한다. migration은 advisory lock과 DDL을 동일한 QueryRunner에서 실행해 statement_timeout(기본 명령당 60초)이 실제 DDL에도 적용된다. 격리 QA는 100ms 제한/pg_sleep으로 취소·transaction rollback·history 미기록·기존 회원 보존을 확인한다.
