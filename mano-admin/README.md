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

Cloudflare Zero Trust의 Access application에 `admin.mano.io.kr`을 등록하고 기존
Grafana 관리 화면과 동일한 개인 이메일 allow 정책과 로그인 공급자를 재사용합니다.
외부 공개 경로를 따로 두지 않으며 `/api/health`도 Access 뒤에 둡니다. 컨테이너
healthcheck는 내부 주소를 사용하므로 Access의 영향을 받지 않습니다.

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
