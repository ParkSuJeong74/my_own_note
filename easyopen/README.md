# EasyOpen

EasyOpen 제품군의 코드 루트입니다.

## 구조

- `apps/web`: 공개 웹사이트와 다운로드·가이드 UI
- `apps/desktop`: Windows·macOS Electron 앱
- `apps/mobile`: Android 우선 Expo 앱, 향후 iOS 공용
- `apps/catalog`: 공개 Catalog Cloudflare Worker
- `containers/cosyvoice`: CosyVoice 컨테이너 후보

제품 방향과 진행 문서는 `../../Work-Docs/mano/README.md`에서 라우팅합니다. GitHub Actions는 저장소 규칙상 `../.github/workflows`에 유지합니다.

각 앱은 독립적인 `package-lock.json`과 검증 명령을 유지합니다. Catalog 원본은 `apps/catalog/apps.json`이며 Desktop과 Mobile 빌드 전에 각 앱의 `npm run sync:catalog`로 동기화합니다.
