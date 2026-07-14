# Monitoring

Grafana, Loki, Alloy, Prometheus, cAdvisor, Node Exporter로 구성한 단일 서버용 모니터링 스택입니다.

## 시작

`GRAFANA_ADMIN_PASSWORD`를 Doppler 또는 셸 환경에 추가한 뒤 실행합니다.

```sh
docker compose up -d
```

그 다음 라벨이 적용되도록 애플리케이션 컨테이너를 다시 만듭니다.

```sh
docker compose -f ../alcove_be/docker-compose.yml up -d
docker compose -f ../tono-be/docker-compose.yml up -d
```

Grafana는 호스트의 `127.0.0.1:3000`에서 열립니다. Nginx Proxy Manager에서 연결할 때는 같은 `proxy` 네트워크의 `grafana:3000`을 Forward Hostname/IP와 Port로 지정하세요. Loki와 Prometheus는 Docker 내부 네트워크에만 노출됩니다.

## 로그 조회

Grafana의 **Explore > Loki**에서 다음 LogQL을 사용합니다.

```logql
{project="alcove"}
{project="tono", service_name="api"}
{project=~"alcove|tono"} |= "error"
```

기본 관리자 조직에는 `Alcove Logs`, `Tono Logs` 대시보드가 각각 provision됩니다. 관리자의 Loki 데이터소스는 전환 전 로그가 들어 있는 `fake` tenant와 새 `alcove`, `tono` tenant를 모두 조회합니다.

`monitoring.logs=true` 라벨이 붙은 컨테이너만 Alloy가 수집합니다. 새 서비스를 추가할 때 아래 라벨을 지정하세요.

```yaml
labels:
  monitoring.logs: "true"
  monitoring.project: "project-name"
  monitoring.service: "service-name"
```

로그와 Prometheus 지표의 보존 기간은 모두 30일입니다. `loki/config.yml`의 `retention_period`와 Compose의 `--storage.tsdb.retention.time`으로 변경할 수 있습니다.

## 서비스별 사용자 격리

Loki는 `alcove`와 `tono` tenant로 로그를 물리적으로 분리합니다. 대시보드 변수나 폴더 권한만으로 격리하지 말고, Grafana Organization별로 tenant가 고정된 데이터소스를 사용해야 합니다.

Grafana의 Server Admin 계정으로 다음 작업을 합니다.

1. **Administration > General > Organizations**에서 `Alcove`, `Tono` Organization을 생성합니다.
2. Alcove Organization으로 전환한 뒤 **Connections > Data sources > Add data source > Loki**를 선택합니다.
3. URL을 `http://loki:3100`으로 지정합니다.
4. **Custom HTTP Headers**에 `X-Scope-OrgID` / `alcove`를 추가하고 저장합니다.
5. Tono Organization에서도 같은 데이터소스를 만들되 헤더 값은 `tono`로 지정합니다.
6. 각 Organization에서 **Dashboards > New > Import**로 `grafana/dashboards/alcove-logs.json` 또는 `tono-logs.json`을 가져옵니다.
7. **Administration > Users and access > Users**에서 일반 사용자를 초대하고 해당 Organization에만 `Viewer` 역할로 배정합니다.
8. 일반 사용자가 `Main Org.`에도 들어 있다면 Main Org.에서 제거합니다. 그렇지 않으면 조직 전환을 통해 관리자용 데이터소스에 접근할 수 있습니다.

Alcove/Tono Organization의 사용자를 `Admin` 역할로 주지 마세요. `Viewer`도 자기 Organization의 데이터소스에서 자유롭게 쿼리할 수 있지만, tenant 헤더가 고정되어 다른 서비스 tenant는 조회할 수 없습니다.

설정 변경을 배포할 때 Loki와 Alloy를 함께 다시 만듭니다.

```sh
docker compose up -d --force-recreate loki alloy grafana
docker compose logs --tail=100 loki alloy grafana
```

전환 이후 새 로그는 각각 `alcove`, `tono` tenant로 들어갑니다. 전환 전에 single-tenant 모드에서 저장된 로그는 `fake` tenant에 남으며 관리자 조직에서만 조회하도록 설정되어 있습니다.

## 확인

```sh
docker compose ps
docker compose logs --tail=100 alloy loki prometheus grafana
curl http://127.0.0.1:3000/api/health
```
