# EasyOpen 웹사이트 MVP

한국어 오픈소스 프로그램 탐색 사이트. 초기에는 사용자 홈서버, Docker, DB 없이 Cloudflare Workers Static Assets로 운영합니다.

## 실행

```bash
cd easyopen/apps/web
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

## Cloudflare Workers Builds 설정

- 독립된 Worker 프로젝트 생성
- Repository: my_own_note
- Root directory: easyopen/apps/web
- Build command: `npm run build`
- Deploy command: `npm run deploy`
- Environment variable: `NEXT_PUBLIC_SITE_URL=https://실제-배포-도메인` (미설정 시 예시 주소 사용)
- Optional analytics variable: `NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN` (Cloudflare Web Analytics 사이트 토큰)
- Optional search ownership variables: `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`,
  `NEXT_PUBLIC_NAVER_SITE_VERIFICATION`, `NEXT_PUBLIC_BING_SITE_VERIFICATION`. 등록한 검색엔진의
  공개 verification 값만 Workers Builds의 build variables에 추가합니다.
- 배포 채널 URL(실제 등록 완료 후 설정): `NEXT_PUBLIC_MICROSOFT_STORE_URL`, `NEXT_PUBLIC_HOMEBREW_CASK_URL`, `NEXT_PUBLIC_GOOGLE_PLAY_URL`, `NEXT_PUBLIC_TESTFLIGHT_URL`. Homebrew 공개 테스트 설치 안내는 환경 변수 없이 표시됩니다. 그 외 스토어는 미설정 시 `준비 중`으로 표시됩니다.
- Build watch paths: `easyopen/apps/web/**` 및 향후 공용 의존성 폴더
- Git push 및 최초 배포는 기존 AGENTS.md에 따라 별도 승인 후 진행
- 나중에 `mano.io.kr`을 연결하기 전에 기존 DNS/Worker Route/Pages 연동 여부 확인

Cloudflare Workers Builds 초기 설정 순서:

1. Git 저장소를 Cloudflare Worker에 연결합니다.
2. Root directory를 반드시 `easyopen/apps/web`으로 지정합니다. `/`로 두면 의존성이 설치되지 않습니다.
3. Build command에 `npm run build`, Deploy command에 `npm run deploy`를 입력합니다.
4. 최초 배포 주소가 확정되면 `NEXT_PUBLIC_SITE_URL`에 해당 `workers.dev` 또는 커스텀 도메인을 입력합니다.
5. 첫 배포는 `workers.dev` 주소에서 확인합니다.
6. 홈·목록·상세·가이드·카테고리·`sitemap.xml`·`robots.txt`를 점검합니다.
7. 도메인 충돌 확인 후 사용자 승인을 받아 커스텀 도메인을 연결합니다.

## 운영 통계

- `/stats/`: 모든 공개 EasyOpen prerelease의 Windows EXE·Android APK 다운로드 누계를 표시합니다.
- 방문자·페이지 조회·유입 경로: Cloudflare Web Analytics 대시보드에서 확인합니다.
- Cloudflare의 Web Analytics 사이트를 만든 뒤 사이트 토큰을 Workers Builds의
  `NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN`에 등록하고 다시 배포해야 방문 통계가 수집됩니다.
- 토큰이 없으면 외부 분석 스크립트를 로드하지 않으며 `/stats/`에 `설정 필요`로 표시합니다.
- 다운로드 수는 GitHub의 파일 요청 횟수이므로 설치 완료나 고유 사용자 수로 해석하지 않습니다.

## 검색 등록과 운영 보안

저장소가 제공하는 항목:

- canonical, Open Graph/Twitter 카드, `robots.txt`, `sitemap.xml`
- Google·네이버·Bing 소유권 확인용 선택적 메타태그
- Workers Static Assets용 `public/_headers` 보안 헤더
- `workers.dev` 미리보기 주소의 `X-Robots-Tag: noindex`
- 토큰이 있을 때만 로드되는 Cloudflare Web Analytics

배포 후 운영자가 외부 콘솔에서 수행할 항목:

1. Google Search Console에 운영 도메인을 DNS 방식으로 확인하고
   `https://easy-open.mano.io.kr/sitemap.xml`을 제출합니다.
2. 네이버 서치어드바이저와 Bing Webmaster Tools를 사용할 경우 발급된 verification 값만 위 build
   variables에 입력하고 다시 빌드한 뒤 소유권 확인을 완료합니다.
3. Cloudflare Web Analytics에서 `easy-open.mano.io.kr` 사이트를 만들고 사이트 토큰을
   `NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN`에 입력합니다.
4. Cloudflare SSL/TLS는 `Full (strict)`와 HTTPS 강제를 사용합니다. WAF·봇 규칙을 추가할 때는
   검증된 검색엔진과 GitHub/스토어 검증 요청을 차단하지 않는지 로그로 확인합니다.
5. 홈페이지, `/download/`, `/sitemap.xml`을 외부 가용성 감시 대상으로 등록합니다.

verification 값과 Analytics 사이트 토큰은 브라우저 HTML에 공개되는 식별자이며 인증 비밀값이
아닙니다. Google OAuth secret, API key, Cloudflare API token은 `NEXT_PUBLIC_*` 변수에 넣지 않습니다.

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
