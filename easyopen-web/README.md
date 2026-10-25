# EasyOpen 웹사이트 MVP

한국어 오픈소스 프로그램 탐색 사이트. 초기에는 사용자 홈서버, Docker, DB 없이 Cloudflare Pages 정적 호스팅으로 운영합니다.

## 실행

```bash
cd easyopen-web
npm ci
npm run dev
npm run test
npm run typecheck
npm run build
```

Node.js 20.9 이상을 사용합니다. `npm run build` 결과물은 `out/`에 생성됩니다.
로컬에서 정적 결과물까지 확인하려면 다음을 실행합니다.

```bash
python3 -m http.server 4173 --directory out
```

## Pages 설정
- 독립된 Pages 프로젝트 생성
- Repository: my_own_note
- Root directory: easyopen-web
- Build command: `npm run build`
- Build output directory: `out`
- Environment variable: `NEXT_PUBLIC_SITE_URL=https://실제-배포-도메인` (미설정 시 예시 주소 사용)
- Build watch paths: `easyopen-web/**` 및 향후 공용 의존성 폴더
- Git push 및 최초 배포는 기존 AGENTS.md에 따라 별도 승인 후 진행
- 나중에 `mano.io.kr`을 연결하기 전에 기존 DNS/Worker Route/Pages 연동 여부 확인

Cloudflare Pages 초기 설정 순서:

1. Git 저장소를 Cloudflare Pages에 연결하고 새 프로젝트를 만듭니다.
2. 위 빌드 설정과 `NEXT_PUBLIC_SITE_URL`을 입력합니다.
3. 첫 배포는 `pages.dev` 미리보기에서 확인합니다.
4. 홈·목록·상세·가이드·카테고리·`sitemap.xml`·`robots.txt`를 점검합니다.
5. 도메인 충돌 확인 후 사용자 승인을 받아 커스텀 도메인을 연결합니다.

## 콘텐츠 등록
`src/data/apps.json` 항목 추가 후 `npm run test` 및 `npm run build` 수행. 원본의 소스·라이선스·다운로드 URL을 검증하세요. 현재는 원클릭 설치 제공 안 함.

## 검증 명령

```bash
npm audit
npm run test
npm run typecheck
npm run build
```

배포 전에는 위 명령을 모두 통과하고 `out/`의 정적 페이지를 실제 브라우저에서
확인합니다.
