# EasyOpen Account API

EasyOpen 전용 Google 로그인, 회원, 결제 provider 계약, entitlement와 관리자 API입니다. `mano.io.kr` 서비스와 DB·쿠키·OAuth client를 공유하지 않습니다.

실제 결제 공급자와 가격은 아직 결정되지 않았습니다. 따라서 checkout은 `EASYOPEN_BILLING_PROVIDER`가 없으면 503, 값만 있으면 501을 반환하며 결제 성공을 만들지 않습니다. Free 기능은 이 서버 없이도 동작해야 합니다.

필수 환경변수: `EASYOPEN_API_ORIGIN`, `EASYOPEN_WEB_ORIGIN`, `EASYOPEN_ADMIN_ORIGIN`, `EASYOPEN_GOOGLE_CLIENT_ID`, `EASYOPEN_GOOGLE_CLIENT_SECRET`, `EASYOPEN_SESSION_SECRET`, `EASYOPEN_ADMIN_EMAILS`, `PGHOST`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`.

운영 API origin은 `https://easyopen-api.mano.io.kr`이며 관리자 UI는 같은 origin의
`/admin`에서 제공합니다. 따라서 `EASYOPEN_API_ORIGIN`과 `EASYOPEN_ADMIN_ORIGIN`은 모두
`https://easyopen-api.mano.io.kr`로 설정합니다. Google OAuth 승인 리디렉션 URI는
`https://easyopen-api.mano.io.kr/v1/auth/google/callback`입니다.

관리자 API는 Google 로그인 이메일이 `EASYOPEN_ADMIN_EMAILS` allowlist에 있을 때만 접근할 수 있습니다. 수동 entitlement 부여·회수는 transaction과 audit event를 함께 기록합니다.
