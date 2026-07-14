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

`monitoring.logs=true` 라벨이 붙은 컨테이너만 Alloy가 수집합니다. 새 서비스를 추가할 때 아래 라벨을 지정하세요.

```yaml
labels:
  monitoring.logs: "true"
  monitoring.project: "project-name"
  monitoring.service: "service-name"
```

로그와 Prometheus 지표의 보존 기간은 모두 30일입니다. `loki/config.yml`의 `retention_period`와 Compose의 `--storage.tsdb.retention.time`으로 변경할 수 있습니다.

## 확인

```sh
docker compose ps
docker compose logs --tail=100 alloy loki prometheus grafana
curl http://127.0.0.1:3000/api/health
```
