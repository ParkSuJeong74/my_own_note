# MANO brand landing

MANO(My Own Note)의 공식 브랜드 랜딩페이지 초안입니다. 실서비스 운영 중인 EasyOpen(`https://easy-open.mano.io.kr/`)과 연결하지만 기존 EasyOpen 프로젝트를 수정하지 않습니다.

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

**아직 `mano.io.kr`에 연결하지 않은 코드입니다.** 현재 다른 서비스가 연결되어 있으니 도메인 변경 전에 확인해야 합니다.

- Worker 프로젝트: 새 프로젝트 `mano-web` 권장 (기존 서비스와 독립)
- Git Repository: 현재 `my_own_note`가 연결된 GitHub 저장소
- Root directory: `mano-web`
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- 환경 변수: 없음
- 빌드 감시 경로 예시: `mano-web/**` (공유 파일 의존성이 생기면 갱신)
- 먼저 `*.workers.dev`에서 QA, 그다음 현재 루트 도메인 Route/DNS 충돌 확인 및 명시적 승인 후 `mano.io.kr` 연결

`wrangler.jsonc`의 `assets.directory`는 반드시 `./dist`여야 합니다. `.`을 지정하면
`node_modules`까지 업로드 대상으로 읽어 대용량 `workerd` 파일 때문에 배포가 실패합니다.

주의: 루트 저장소의 `.github/workflows/`가 Git push로 자동 배포를 유발할 수 있습니다. **커밋, 푸시, 배포, DNS 전환은 각각 별도 요청**이 필요합니다.

## 현재 표현 범위

- EasyOpen: 현재 운영 중인 프로젝트로 소개하고 공식 사이트에 연결합니다.
- MANO Apps: 구상 단계로 표시합니다.
- EasyOpen Manager: 연구 단계로 표시합니다.
- 유료판·가입·결제·소프트웨어 원클릭 설치를 실구현한 것처럼 표시하지 않습니다.
- OG 카드에는 MANO 브랜드 전용 그래픽을 사용합니다.

## 후속 작업

현재 사이트(기존 `mano.io.kr`)의 실제 배포 경로와 도메인 설정 점검, 브랜드 문구 확정, 사용자 QA, 모바일 UI 점검, 접근성 검증, 기존 도메인 변경 승인, 필요 시 정적 페이지에서 Next.js로 이전 검토.
