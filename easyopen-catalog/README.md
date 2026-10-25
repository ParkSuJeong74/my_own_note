# EasyOpen 정적 카탈로그

`apps.json`은 웹·데스크톱·Android가 함께 쓰는 **소규모 선별 프로그램 메타데이터**입니다. 오픈소스 소스코드, 설치 바이너리, 모델 가중치를 보관하지 않습니다.

- `install.windows.method=winget`은 **개발자 테스트용 동작 후보**일 뿐 검증 완료의 의미가 아닙니다. 실제 Windows 환경에서 버전·공식 출처·설치·업데이트·제거를 검증하기 전에는 사용자 화면에 '검증됨'으로 표시하지 않습니다.
- CosyVoice, Whisper, Ollama는 모델별 라이선스 검토와 설치 어댑터 작업이 필요합니다. 현재 공식 링크만 제공됩니다.
- Android는 공식 스토어 링크를 우선합니다. 별도 APK 다운로더·무인 설치를 포함하지 않습니다.
- `license` 표시는 **초안**이며 상품화/재배포 전에 코드를 포함한 의존성, 모델, 상표 권리를 따로 확인해야 합니다.
- 추가할 패키지의 ID·버전·서명·해시·OS 검증일은 별도 승인된 매니페스트로 관리해야 합니다.

`node --test easyopen-desktop/tests/*.test.mjs easyopen-android/tests/*.test.mjs`로 정적 데이터 검사를 실행할 수 있습니다.

## Cloudflare 배포

공개 계약 URL은 `https://catalog.easy-open.mano.io.kr/v1/apps.json`입니다.

```bash
npm ci
npm test
npm run build
npm run deploy
```

Cloudflare에는 `dist`만 업로드됩니다. 원본·스크립트·의존성은 정적 자산에 포함하지 않습니다.
앱은 원격 응답이 실패하거나 유효하지 않으면 각 릴리스에 포함된 Catalog 사본을 사용합니다.

### Cloudflare Git 연동 설정

Cloudflare Builds가 GitHub 저장소를 직접 빌드·배포한다. GitHub Actions에서 Catalog를 중복
배포하지 않는다. 다음 두 설정 중 하나만 사용한다.

권장 설정:

- Root directory: `/easyopen-catalog`
- Build command: `npm ci && npm run build`
- Deploy command: `npx wrangler deploy`

Root directory를 `/`로 유지해야 한다면 다음처럼 하위 폴더로 이동한다.

- Build command: `cd easyopen-catalog && npm ci && npm run build`
- Deploy command: `cd easyopen-catalog && npx wrangler deploy`

배포 성공 후 Cloudflare Dashboard → Workers & Pages → `easyopen-catalog` → Settings →
Domains & Routes에서 Custom Domain `catalog.easy-open.mano.io.kr`을 추가한다. 마지막으로
`https://catalog.easy-open.mano.io.kr/v1/apps.json`의 JSON, CORS, 5분 캐시 헤더를 확인한다.

Custom Domain이 활성화되기 전에도 앱은 내장 Catalog로 동작합니다. 도메인을 다른 값으로
정하면 Desktop과 Android의 `CATALOG_URL`을 함께 변경해야 합니다.
