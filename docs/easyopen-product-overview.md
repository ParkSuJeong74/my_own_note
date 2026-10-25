# EasyOpen 서비스 개요

## 목적과 사용자
한국의 비개발자가 무료 오픈소스 프로그램을 쉽게 검색하고 공식 출처에서 다운로드하며 간단한 사용 순서를 이해하도록 돕는다. 모든 분야로 확장 가능하도록 분류하되 초기 등록 프로그램은 소수로 제한한다.

## 사용자 흐름
1. EasyOpen 가이드에서 서비스 사용법 확인 → 2. 홈·카테고리·프로그램 목록에서 목적과 운영체제로 탐색 → 3. 프로그램 상세에서 공식 사이트·소스·라이선스·권장 사용 순서 확인 → 4. 공식 배포처에서 다운로드.

## 현재 제공 기능과 한계
- 현재는 외부 프로그램을 직접 설치하지 않는다. '원클릭 설치'는 별도 서명된 로컬 설치 관리자에서 향후 제공 가능성을 연구한다.
- `EasyOpen 가이드`는 서비스 이용 방법을 안내하고, 각 오픈소스의 첫 사용 순서는 해당 프로그램 상세에서 제공한다.
- 카테고리 URL은 정적 호스팅과 브라우저 인코딩 차이를 피하기 위해 고정 영문 slug를 사용한다.
- 소프트웨어 소개와 가이드는 등록 시점의 검토 자료로, 최신성이나 100% 안전성을 보장하지 않는다.
- 현재 앱 정보는 `easyopen-web/src/data/apps.json`으로 관리하며 검증일을 별도 표기한다.

## 기술/호스팅
- Next.js App Router, TypeScript, CSS, static export (`out/`), Cloudflare Workers Static Assets.
- 홈서버, Docker, D1, R2, API 서버는 초기에 사용하지 않는다.
- 독립 Worker `easyopen-web`에 레포 root `easyopen-web`, build `npm run build`, deploy `npm run deploy`를 지정한다.
- 테스트 배포는 workers.dev로 시작, 최종 `mano.io.kr`은 기존 서비스 DNS/route를 검증한 뒤 승인받아 연결.

## 배포/변경 안전
- 별도 요청 전 commit, push, Cloudflare 리소스 생성/삭제, DNS 전환 금지.
- `mano-admin`, `docker-compose.yml`은 EasyOpen 작업을 위해 변경하지 않는다.
- 실제 원클릭 설치 기능을 추가할 때는 서명, 공식 출처 검증, SHA256, 업데이트/롤백, 라이선스·모델 재배포권 등 별도 설계 승인 필요.
