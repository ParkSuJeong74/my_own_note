# Mano Admin

홈서버 서비스의 상태와 주요 관리 도구 링크를 한곳에서 보여주는 개인용 조회 전용
관제 포털입니다. Grafana, File Browser, MinIO, n8n을 대체하지 않고 상태를 요약한 뒤
상세 관리는 각 서비스로 연결합니다.

## MVP 범위

- Overview: CPU, 메모리, 루트 디스크와 전체 서비스 상태
- Services: 정적 서비스 카탈로그, Prometheus 기반 상태, 바로가기
- Workspaces: Project A/T, Blog, YouTube 확장을 위한 메뉴 구조
- `GET /api/health`: Admin 컨테이너 health endpoint

Docker 제어, 파일 관리, 로그 검색, n8n API, AI 연동, 작업 실행 및 승인 기능은
포함하지 않습니다.

## 구조

```text
Browser
  │ Cloudflare Access
  ▼
Cloudflare Tunnel ──▶ mano-admin:3000
                         │
                         │ read-only Prometheus HTTP query
                         ▼
                    prometheus:9090
                         ▲
              exporters / service metrics
```

Admin은 Docker socket을 사용하지 않습니다. 브라우저도 Prometheus에 직접 접근하지
않으며 서버 컴포넌트가 사전에 정의된 PromQL만 실행합니다.

서비스 정의는 `src/config/services.ts`, 상태 조회는 `src/lib/prometheus.ts`에
분리되어 있습니다. 향후 n8n 상태 연동이나 승인 기능을 추가하더라도 화면에서 직접
n8n을 호출하지 않고 별도의 서버 adapter를 두는 구조로 확장합니다.

자세한 설계와 범위는 [docs/architecture.md](docs/architecture.md)를 참고하세요.

## 로컬 실행

```bash
npm install
npm run dev
```

로컬에서 Prometheus에 연결하지 못하면 관련 지표와 서비스는 `unknown`으로 표시됩니다.
UI와 health endpoint는 그대로 사용할 수 있습니다.

```bash
curl http://127.0.0.1:3000/api/health
```

검증:

```bash
npm run typecheck
npm test
npm run build
docker compose config --quiet
bash -n scripts/deploy-home-server.sh
```

## 환경변수

| 변수 | 기본값 | 용도 |
| --- | --- | --- |
| `PROMETHEUS_URL` | `http://prometheus:9090` | 내부 Prometheus API |
| `FILE_BROWSER_URL` | `https://files.mano.io.kr` | File Browser 바로가기 |
| `GRAFANA_URL` | `https://grafana.mano.io.kr` | Grafana 바로가기 |
| `MINIO_CONSOLE_URL` | `https://minio-admin.mano.io.kr` | MinIO Console 바로가기 |
| `CF_ACCESS_TEAM_DOMAIN` | 없음, 필수 | `https://<team>.cloudflareaccess.com` |
| `CF_ACCESS_AUD` | 없음, 필수 | Admin Access application의 AUD tag |
| `CF_ACCESS_ALLOWED_EMAIL` | 없음, 필수 | Admin에 접근할 개인 이메일 한 개 |

기본값은 현재 Mano Tunnel의 Published application 주소와 일치합니다. 실제 홈서버
도메인이 달라지면 Doppler `mano/prd`에서 덮어씁니다. Admin에는
서비스 비밀번호, API key 또는 Docker 권한을 주입하지 않습니다.

## 홈서버 배포

Admin은 별도 저장소가 아니라 `my_own_note/mano-admin`에 포함되며 루트 Compose와
기존 배포 파이프라인으로 함께 관리됩니다.

사전 조건:

- `my_own_note`가 먼저 배포되어 있어야 합니다.
- `my_own_note_proxy`, `my_own_note_monitoring` 네트워크가 존재해야 합니다.
- 홈서버에서 Doppler `mano/prd`를 사용할 수 있어야 합니다.

수동 배포:

```bash
cd /home/ellie/my_own_note
./scripts/deploy-home-server.sh
```

스크립트는 루트 Compose 설정을 확인한 후 Admin 이미지를 포함해 변경된 서비스를
조정합니다. `down`, `--remove-orphans`, 강제 pull 또는 볼륨 삭제를 실행하지 않습니다.

GitHub Actions는 Admin의 타입 검사, 테스트와 빌드를 기존 검증 job에서 실행합니다.
`master` 검증 성공 후 전체 저장소를 `/home/ellie/my_own_note`로 rsync하고 기존 배포
스크립트를 실행합니다.

## Cloudflare Tunnel과 Access

기존 Mano Tunnel의 Public Hostname에 다음 항목을 추가합니다.

| 항목 | 값 |
| --- | --- |
| Hostname | `admin.mano.io.kr` |
| Service type | `HTTP` |
| Service URL | `mano-admin:3000` |

`cloudflared-mano`와 `mano-admin`은 모두 `my_own_note_proxy`에 연결되므로 컨테이너
이름으로 직접 통신합니다. 같은 hostname을 Nginx Proxy Manager 경유 방식과 동시에
설정하지 않습니다.

Published application은 origin 연결만 만들며 사용자 인증을 활성화하지 않습니다.
다음 순서로 별도의 Access application과 정책을 추가해야 합니다.

1. Cloudflare Zero Trust에서 **Access controls > Applications**로 이동합니다.
2. **Add an application > Self-hosted**를 선택합니다.
3. Application name은 `Mano Admin`, public hostname은 `admin.mano.io.kr`로 지정하고
   path는 비워 전체 hostname을 보호합니다.
4. `Allow` 정책 하나를 만들고 **Include > Emails**에 본인의 정확한 이메일 주소 한
   개만 입력합니다. 이메일 domain 전체 허용은 사용하지 않습니다.
5. 기존 Grafana Access application과 같은 identity provider를 선택합니다. 개인
   이메일 OTP를 사용 중이면 같은 One-time PIN 방식을 재사용할 수 있습니다.
6. Admin application에 `Bypass`, `Service Auth`, Everyone 허용 정책이 없는지
   확인하고 저장합니다.
7. Application의 **Additional settings**에서 **Application Audience (AUD) Tag**를
   복사합니다.
8. Zero Trust team domain인 `https://<team>.cloudflareaccess.com`과 AUD tag, 허용
   이메일을 Doppler `mano/prd`에 다음 이름으로 저장합니다.

```dotenv
CF_ACCESS_TEAM_DOMAIN=https://<team>.cloudflareaccess.com
CF_ACCESS_AUD=<admin-application-aud-tag>
CF_ACCESS_ALLOWED_EMAIL=<your-exact-email>
```

그 다음 기존 배포 스크립트를 실행합니다.

```bash
cd /home/ellie/my_own_note
./scripts/deploy-home-server.sh
```

Cloudflare는 인증된 origin 요청에 `Cf-Access-Jwt-Assertion` 헤더를 추가합니다.
Admin의 Next.js Proxy는 Cloudflare의 회전 JWKS로 RS256 서명을 검증하고 issuer,
Admin application audience, token type과 개인 이메일을 모두 확인합니다. 헤더 존재
여부만 신뢰하거나 자체 로그인 세션을 만들지 않습니다.

`/api/health`만 Docker 내부 healthcheck를 위해 애플리케이션 JWT 검증에서 제외합니다.
외부에서는 hostname 전체가 Access application에 포함되므로 이 경로도 Cloudflare
Access 뒤에 있습니다. 응답은 서비스명과 현재 시각만 포함하고 운영 데이터를 노출하지
않습니다.

### 인증 확인

시크릿 창에서 `https://admin.mano.io.kr`을 열었을 때 Cloudflare Access 로그인이 먼저
나오고, 허용 이메일로 인증한 뒤에만 Admin이 보여야 합니다. 다른 이메일은 Access
단계에서 거부되어야 합니다.

홈서버에서 origin의 이중 검증도 확인합니다.

```bash
# JWT가 없는 직접 요청은 거부
curl -i http://127.0.0.1:3100/

# 위조한 헤더도 거부
curl -i -H 'Cf-Access-Jwt-Assertion: invalid' http://127.0.0.1:3100/

# Docker healthcheck용 최소 endpoint만 허용
curl -i http://127.0.0.1:3100/api/health
```

예상 상태 코드는 각각 `401`, `403`, `200`입니다. 설정 누락 시 첫 번째 요청은
fail-closed 동작으로 `503`을 반환합니다.

## 상태 판정

- `healthy`: Prometheus query가 시계열을 반환하고 값이 모두 `1`
- `unhealthy`: 시계열이 존재하지만 하나 이상의 값이 `1`이 아님
- `unknown`: 해당 서비스 query가 없거나 Prometheus 조회가 실패하거나 데이터가 없음

n8n, Prometheus, Loki, Alloy는 기존 scrape target의 `up`을 사용합니다. Grafana,
File Browser, MinIO는 자체 scrape 데이터가 없어 `my_own_note`의 기존 Blackbox
Exporter에 내부 health probe를 추가합니다. Nginx Proxy Manager는 이번 MVP에서
별도 probe를 만들지 않아 `unknown`으로 표시됩니다.

## 운영 확인

```bash
docker compose ps mano-admin
docker compose logs --tail=100 mano-admin
curl http://127.0.0.1:3100/api/health
```

Prometheus에서 다음 query를 확인할 수 있습니다.

```promql
up{job=~"n8n|prometheus|loki|alloy"}
probe_success{job="blackbox-http", project="mano"}
```
