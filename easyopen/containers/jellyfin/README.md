# EasyOpen Jellyfin container adapter

EasyOpen은 Jellyfin 프로젝트가 GHCR에 공개한 공식 multi-architecture 이미지를
`image-lock.json`의 digest로 고정해 검증합니다. 자동 검증과 수동 게시를 분리하며, 수동 게시가
승인되면 변경되지 않은 manifest와 layer를 EasyOpen GHCR candidate namespace로 복제합니다.
소스 재컴파일이나 layer 추가가 없으므로 이 디렉터리에 `Dockerfile`이 없는 것이 의도된 구조입니다.

현재 Desktop manifest는 실제 EasyOpen GHCR candidate가 게시되고 그 digest가 검토되기 전까지
upstream digest를 사용합니다. 수동 게시가 성공했다는 이유만으로 정식 지원으로 승격하지 않습니다.

## 실행 계약

- image: `ghcr.io/jellyfin/jellyfin@sha256:c3efa69a22f2691fc88d6bb035e87a8560e395a6047f062fb381c61c3185e8f5`
- loopback port: `127.0.0.1:8096:8096`
- durable volume: `easyopen-jellyfin-config:/config`
- disposable volume: `easyopen-jellyfin-cache:/cache`
- media: 사용자가 선택한 단일 폴더를 `/media`에 read-only bind mount
- health: `http://127.0.0.1:8096/System/Info/Public`
- managed labels: `kr.io.mano.easyopen.managed=true`, `kr.io.mano.easyopen.app-id=jellyfin`

Desktop의 실제 명세와 검증은 `apps/desktop/electron/container-apps.ts`와
`apps/desktop/electron/container-installer.ts`에 있습니다. 배포 manifest는
`apps/catalog/container-images.json`과 `apps/desktop/resources/container-images.json`에
동일한 digest를 사용합니다.

## 지원 상태

Windows와 macOS의 Docker Desktop 위에서 실행하는 Jellyfin 컨테이너는 Jellyfin 프로젝트의
공식 지원 범위 밖입니다. EasyOpen에서는 실기기 검증이 끝날 때까지 `테스트 중`으로만
표시합니다. GPU transcoding, DLNA와 모바일 LAN 연결은 현재 계약에 포함하지 않습니다.

digest를 변경할 때는 tag만 바꾸지 말고 다음을 모두 갱신해야 합니다.

1. upstream GHCR manifest와 amd64/arm64 platform 확인
2. `image-lock.json`의 목록 digest·플랫폼별 child digest와 두 container manifest 동기화
3. 단위 테스트, health, read-only media, volume 보존 실테스트
4. 라이선스·보안 검토 기록

## 법률·브랜드 경계

- Jellyfin server의 GPL-2.0 조건에 따라 대응 소스와 라이선스 고지를 함께 제공합니다.
- EasyOpen은 Jellyfin 프로젝트의 공식 배포판 또는 공식 클라이언트가 아닙니다.
- Jellyfin 로고를 EasyOpen 이미지나 패키지의 로고로 사용하지 않습니다.
- `Jellyfin` 텍스트는 호환 대상과 upstream 출처를 식별하는 데만 사용합니다.
- 공개·상용 출시 전 상표 및 전체 이미지 종속성은 별도 법률 검토가 필요합니다.

검증 CI: `[AUTO] EasyOpen · Validate`의 `jellyfin-supply-chain` job

게시 CI: `[MANUAL] EasyOpen · Publish Jellyfin Candidate`
