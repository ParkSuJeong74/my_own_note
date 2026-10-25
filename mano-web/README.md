# MANO brand landing

MANO(My Own Note)의 공식 브랜드 랜딩페이지입니다. `https://mano.io.kr/`에서 운영하며 EasyOpen(`https://easy-open.mano.io.kr/`)과 연결하지만 기존 EasyOpen 프로젝트를 수정하지 않습니다.

## 구조

- `index.html`: 랜딩 전체 구성, 링크, 검색엔진 메타데이터
- `assets/style.css`: 반응형 시각 시스템
- `assets/favicon.svg`, `assets/og.png`: 브랜드 자산
- `robots.txt`, `sitemap.xml`, `_headers`: 정적 배포 설정
- `scripts/build.mjs`: 의존성 없는 정적 빌드 (결과: `dist/`)
- `tests/landing.test.mjs`: 페이지/링크/상태/정적 자산/접근성 회귀 테스트

## 로컬 실행

Node 20 이상 권장. 패키지 설치가 필요 없습니다.

```bash
cd my_own_note/mano-web
npm run typecheck
npm test
npm run build
python3 -m http.server 4173 --directory dist
# http://localhost:4173
```

## Cloudflare Workers Static Assets

Cloudflare Worker `mano-web`이 `mano.io.kr`의 운영 랜딩을 제공합니다.

- Worker 프로젝트: 새 프로젝트 `mano-web` 권장 (기존 서비스와 독립)
- Git Repository: 현재 `my_own_note`가 연결된 GitHub 저장소
- Root directory: `mano-web`
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- 환경 변수: 없음
- 빌드 감시 경로 예시: `mano-web/**` (공유 파일 의존성이 생기면 갱신)
- 변경은 `*.workers.dev`에서 먼저 QA한 뒤 운영 `mano.io.kr`에 반영

`wrangler.jsonc`의 `assets.directory`는 반드시 `./dist`여야 합니다. `.`을 지정하면
`node_modules`까지 업로드 대상으로 읽어 대용량 `workerd` 파일 때문에 배포가 실패합니다.

주의: 루트 저장소의 `.github/workflows/`가 Git push로 자동 배포를 유발할 수 있습니다. **커밋, 푸시, 배포, DNS 전환은 각각 별도 요청**이 필요합니다.

## 현재 표현 범위

- EasyOpen: 현재 운영 중인 프로젝트로 소개하고 공식 사이트에 연결합니다.
- MANO Apps: 구상 단계로 표시합니다.
- EasyOpen Manager: 연구 단계로 표시합니다.
- 유료판·가입·결제·소프트웨어 원클릭 설치를 실구현한 것처럼 표시하지 않습니다.
- OG 카드에는 MANO 브랜드 전용 그래픽을 사용합니다.

## 운영 변경

브랜드 문구나 레이아웃을 바꿀 때는 테스트·빌드와 `workers.dev` 검증을 먼저 수행합니다. 정적 구성으로 해결할 수 없는 서버 기능이 실제로 필요해질 때만 프레임워크 이전을 검토합니다.
