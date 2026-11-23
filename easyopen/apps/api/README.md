# EasyOpen Account Web (Next.js)

계정·이용 권한·기기 연결·관리자 **화면**만 제공한다. 인증·DB·결제·기기 세션은 `../server`의 NestJS + TypeORM이 담당한다. 공개 주소는 기존 `https://easyopen-api.mano.io.kr`이며 별도 DNS 변경이 필요하지 않다.

- `/workspace`, `/workspace/programs`, `/workspace/purchases`, `/workspace/connect`, `/admin`: Next.js 화면.
- `/v1/**`, `/api/health`, 승인·로그아웃 POST: 내부 NestJS로 rewrite.
- SSR은 cookie를 내부 backend에 전달한다. 브라우저 세션을 자체 검증하거나 DB에 직접 접속하지 않는다. backend 장애는 로그인 없음으로 숨기지 않고 오류·재시도를 표시한다.
- 유일한 앱 설정은 `EASYOPEN_BACKEND_ORIGIN`이다. 로컬 기본 `http://127.0.0.1:3001`, Compose는 `http://easyopen-server:3001`. rewrite는 빌드 결과에 포함되므로 Docker build arg와 runtime env를 같게 설정한다.
- 이 컨테이너에는 Google/세션 secret·DB 비밀번호·관리자 allowlist를 전달하지 않는다.

Node 22.23.5에서 `npm ci && npm test && npm run typecheck && npm run build`. 전체 인증·DB·proxy QA는 `../server/README.md`를 따른다. 기존 `db/*.sql`은 이전 SQL 관리 DB 호환성 테스트용이며 운영 적용은 이제 TypeORM migration runner가 맡는다.

배포 전 DB 백업 및 기존 이미지/SHA를 확보한다. 기존 홈서버 workflow는 backend/web 빌드→DB 준비→migration→두 서비스 health 확인 순서로 실행한다. migration 실패 시 앱 교체 전에 중단된다. 운영 작업은 별도 명시 승인/사용자 실행 범위다. `synchronize`, DB volume 삭제, 자동 down migration은 사용하지 않는다.
