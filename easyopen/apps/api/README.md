# EasyOpen Account API

EasyOpen 전용 Google 로그인, 회원, 결제 provider 계약, entitlement와 관리자 API입니다. `mano.io.kr` 서비스와 DB·쿠키·OAuth client를 공유하지 않습니다.

실제 결제 공급자와 가격은 아직 결정되지 않았습니다. 따라서 checkout은 `EASYOPEN_BILLING_PROVIDER`가 없으면 503, 값만 있으면 501을 반환하며 결제 성공을 만들지 않습니다. Free 기능은 이 서버 없이도 동작해야 합니다.

필수 환경변수: `EASYOPEN_API_ORIGIN`, `EASYOPEN_WEB_ORIGIN`, `EASYOPEN_ADMIN_ORIGIN`, `EASYOPEN_GOOGLE_CLIENT_ID`, `EASYOPEN_GOOGLE_CLIENT_SECRET`, `EASYOPEN_SESSION_SECRET`, `EASYOPEN_ADMIN_EMAILS`, `PGHOST`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`.

운영 API origin은 `https://easyopen-api.mano.io.kr`이며 관리자 UI는 같은 origin의
`/admin`에서 제공합니다. 따라서 `EASYOPEN_API_ORIGIN`과 `EASYOPEN_ADMIN_ORIGIN`은 모두
`https://easyopen-api.mano.io.kr`로 설정합니다. Google OAuth 승인 리디렉션 URI는
`https://easyopen-api.mano.io.kr/v1/auth/google/callback`입니다.

관리자 API는 Google 로그인 이메일이 `EASYOPEN_ADMIN_EMAILS` allowlist에 있을 때만 접근할 수 있습니다. 수동 entitlement 부여·회수는 transaction과 audit event를 함께 기록합니다.

## 웹 작업 공간 배포 확인 순서

2026-11-23 읽기 전용 확인: 공개 `/api/health`는 HTTP 200, `/workspace`는 HTTP 404였다. 새 작업 공간 반영은 확인되지 않았다. 다음 절차는 운영자가 직접 수행한다.

1. 배포 전 Git diff를 검토하고 현재 운영 SHA/이미지와 DB 백업을 확보한다. 이번 변경에는 schema 변경이 없다. 기존 PostgreSQL volume을 삭제하거나 초기화하지 않는다. `db/001-initial.sql`은 빈 DB 초기 생성 때만 적용된다.
2. 홈서버에서 사용하는 Doppler `mano / prd`의 **변수 존재 여부**를 확인한다. 값과 로그를 채팅에 붙이지 않는다.

   | 변수 | 설정 |
   | --- | --- |
   | `EASYOPEN_API_ORIGIN`, `EASYOPEN_ADMIN_ORIGIN` | Compose 고정값 `https://easyopen-api.mano.io.kr` |
   | `EASYOPEN_WEB_ORIGIN` | Compose 고정값 `https://easy-open.mano.io.kr` |
   | `EASYOPEN_GOOGLE_CLIENT_ID`, `EASYOPEN_GOOGLE_CLIENT_SECRET` | EasyOpen 전용 웹 OAuth client |
   | `EASYOPEN_SESSION_SECRET` | 무작위 32자 이상. 교체하면 기존 세션이 무효화됨 |
   | `EASYOPEN_ADMIN_EMAILS` | 관리자 Google 이메일, 복수는 쉼표 구분 |
   | `EASYOPEN_DB_PASSWORD` | 기존 EasyOpen DB와 같은 비밀번호 |
   | `EASYOPEN_DB_NAME`, `EASYOPEN_DB_USER` | 기존값 유지. 생략 기본값 `easyopen` |
   | `EASYOPEN_BILLING_PROVIDER` | 공급자 구현 전에는 비워둠 |

3. Google OAuth client의 승인 리디렉션 URI가 `https://easyopen-api.mano.io.kr/v1/auth/google/callback`인지 확인한다. `/workspace`는 callback URI가 아니다. 테스트 상태라면 실제 로그인할 계정을 허용한 상태여야 한다. MANO의 다른 제품 client를 재사용하지 않는다.
4. 기존 reverse proxy/터널에서 공개 API origin이 `easyopen-api:3000` 또는 홈서버 loopback `127.0.0.1:3200`으로 전달되는 기존 구성을 확인한다. 배치 방식에 맞는 대상 하나를 사용한다. 이미 health가 200인 경우 새 DNS/터널 생성부터 하지 않는다. `/workspace`를 정적 랜딩 서버로 보내지 않는다.
5. 별도 커밋·푸시 및 배포 승인 후 반영한다. `.github/workflows/deploy.yml`은 master의 API 변경도 감지하고 API Node 22.23.5에서 clean install·test·typecheck·build·verify:auth 통과 후 홈서버 배포를 진행한다. 기존 전체 Compose reconcile 경로를 사용하므로 EasyOpen만 배포하는 전용 workflow는 아니다. 작업 중에는 workflow를 직접 실행하지 않았다.
6. 배포 후 아래 순서대로 브라우저에서 확인한다.
   - `/api/health`: HTTP 200, database true.
   - `/workspace`: 계정 화면 표시. 비로그인 상태에서 로그인 링크를 누른 뒤 Google에서 취소해도 세션이 생기지 않는지 확인.
   - `/workspace/purchases`의 Google 로그인: 실계정 동의 후 동일한 이용 권한 화면으로 복귀하고 계정 이메일 표시.
   - 권한이 없는 계정: 유료 이용 권한 없음. DB 조회 실패는 빈 권한으로 숨기지 않고 재시도 안내.
   - 로그아웃: 공개 API의 `/workspace`로 복귀. 새로고침 후 비로그인 표시. 결제 권한이 native 앱에 자동 전달되는 기능은 아직 없다.
   - `/admin`: allowlist 계정만 회원 목록 접근. 일반 계정은 접근 불가.
7. 실패 시 이전 검증 SHA/이미지로 API를 되돌리고 기존 DB volume을 유지한다. DB 암호나 session secret을 임의로 바꿔 해결하지 않는다. 전체 Compose `down -v`는 실행하지 않는다.

## 로컬 회귀 검증

API 지정 Node 22.23.5에서 `npm test && npm run typecheck && npm run build && npm run verify:auth`.
`verify:auth`는 127.0.0.1:4283에 별도 production 서버를 띄우고 테스트 전용 환경변수로 Google 진입 URL·복귀 allowlist·보안 cookie·취소·만료/변조 state·로그아웃 origin을 확인한다. Google 토큰 교환, 실제 계정/DB 접근, 운영 배포 성공을 대신하지 않는다.
