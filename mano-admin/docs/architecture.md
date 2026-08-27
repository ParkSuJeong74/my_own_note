# Mano Admin MVP architecture

## 역할

Mano Admin은 홈서버의 control plane이 아니라 조회 전용 operations portal입니다.
각 도구가 이미 잘 수행하는 기능을 다시 만들지 않고 서비스 발견, 상태 요약과 안전한
이동 경로만 제공합니다.

애플리케이션은 `my_own_note/mano-admin`에 위치하며 루트 Compose, Doppler 설정,
GitHub Actions와 배포 스크립트를 공유합니다. 런타임 경계는 별도 `mano-admin`
컨테이너로 유지합니다.

## 경계

| 영역 | MVP 책임 | 기존 도구 |
| --- | --- | --- |
| 서버 자원 | CPU/메모리/디스크 사용률 요약 | Grafana에서 상세 분석 |
| 서비스 상태 | healthy/unhealthy/unknown 판정 | Prometheus/Blackbox가 수집 |
| 자동화 | n8n 가용성과 링크 표시 | n8n에서 workflow 관리 |
| 파일/객체 | 서비스 링크 표시 | File Browser/MinIO에서 관리 |
| Workspaces | 향후 영역과 정보 구조만 표시 | 실행·승인은 후속 단계 |

Admin은 Docker socket, 컨테이너 제어 API, 서비스 credential, 범용 PromQL 입력과
범용 URL probe 기능을 제공하지 않습니다.

## 코드 구조

```text
src/
├── app/
│   ├── api/health/route.ts
│   ├── services/page.tsx
│   ├── workspaces/page.tsx
│   └── page.tsx
├── components/
├── config/services.ts
└── lib/
    ├── dashboard.ts
    └── prometheus.ts
```

`services.ts`가 표시 이름, 분류, 링크와 허용된 PromQL을 소유합니다. 사용자는 query나
내부 URL을 입력할 수 없습니다. `prometheus.ts`는 3초 timeout과 실패 시 빈 결과를
사용해 Prometheus 장애가 Admin 전체 장애로 전파되지 않게 합니다.

## 네트워크와 보안

Admin은 다음 external Docker network에만 참여합니다.

- `my_own_note_proxy`: `cloudflared-mano`에서 Admin으로 접근
- `my_own_note_monitoring`: Admin에서 Prometheus로 접근

컨테이너는 non-root, read-only filesystem, 모든 Linux capability 제거,
`no-new-privileges`와 제한된 `/tmp`로 실행합니다. 호스트 공개 포트는 loopback의
`3100`뿐입니다.

인증은 기존 Cloudflare Access application 패턴을 재사용합니다. MVP는 애플리케이션
내부 사용자 DB와 로그인 화면을 만들지 않습니다. Tunnel 이외의 public ingress를
추가하지 않는 것이 이 경계의 전제입니다.

Cloudflare edge의 이메일 `Allow` 정책에 더해 Next.js `proxy.ts`가 origin에서
`Cf-Access-Jwt-Assertion`을 다시 검증합니다. Cloudflare JWKS의 RS256 서명,
team-domain issuer, Admin application audience, `type=app`, 허용 이메일이 모두 맞아야
요청을 전달합니다. 설정 누락과 인증 실패는 fail-closed 처리합니다. Docker가 사용하는
`/api/health`만 예외이며 민감한 상태는 반환하지 않습니다.

## 후속 확장 지점

후속 단계에서는 현재 페이지 구조를 유지하면서 다음 adapter와 저장소를 추가할 수
있습니다.

```text
Admin UI → Admin server adapter → n8n API
                            └──→ Admin PostgreSQL
```

Project A/T, Blog, YouTube는 workspace identifier를 안정적으로 유지합니다. Task,
Approval, AutomationRun 등의 도메인 모델과 쓰기 기능은 별도 설계 검토 후 추가하며,
MVP의 Prometheus adapter와 섞지 않습니다.
