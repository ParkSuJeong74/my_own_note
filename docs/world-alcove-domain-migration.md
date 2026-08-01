# world-alcove.com 도메인 전환

## 도메인

| 용도 | 주소 | 원본 |
| --- | --- | --- |
| Alcove FE | `https://world-alcove.com` | Cloudflare Worker `alcove-fe` |
| Alcove API | `https://api.world-alcove.com` | 홈서버 `alcove_api:3000` |
| Grafana | 기존 `https://grafana.mano.io.kr` 유지 | 홈서버 `grafana:3000` |

FE와 API가 같은 `world-alcove.com` site에 있으므로 인증 쿠키가
`workers.dev`와 `mano.io.kr` 사이의 third-party cookie로 취급되지 않는다.

## Cloudflare Worker

Cloudflare Dashboard에서 **Workers & Pages > alcove-fe > Settings >
Domains & Routes > Add > Custom domain**으로 `world-alcove.com`을 연결한다.

**Workers & Pages > alcove-fe > Settings > Variables and Secrets**에 다음
빌드 환경변수를 설정한다.

```dotenv
NEXT_PUBLIC_BE_ORIGIN=https://api.world-alcove.com
```

FE는 이 값이 빌드 타임에 포함되므로 환경변수 변경 후 반드시 새로 배포하고
브라우저에서 새 빌드가 사용되는지 확인한다.

## Cloudflare Tunnel

Cloudflare 계정이 Mano와 Alcove로 분리되어 있으므로 계정별 Tunnel
컨테이너를 실행한다.

```dotenv
CLOUDFLARE_TUNNEL_TOKEN=<기존 Mano Tunnel token>
CLOUDFLARE_ALCOVE_TUNNEL_TOKEN=<새 Alcove Tunnel token>
```

Mano는 기존 `CLOUDFLARE_TUNNEL_TOKEN`을 그대로 사용한다. Alcove 계정에서
새 Tunnel을 만들고 해당 token을 `CLOUDFLARE_ALCOVE_TUNNEL_TOKEN`에
저장한다.

Alcove Tunnel의 **Public Hostnames**에 다음 항목을 추가한다.

| Public hostname | Service |
| --- | --- |
| `api.world-alcove.com` | `http://alcove_api:3000` |
| `assets.world-alcove.com` | `http://minio:9000` |

`cloudflared-alcove`, `alcove_api`, `minio`는 모두 외부 Docker 네트워크
`my_own_note_proxy`에 연결되어 있어 컨테이너 이름으로 접근할 수 있다.
Nginx Proxy Manager를 계속 경유하려면 tunnel service를
`http://nginx-proxy-manager:80`으로 두고 Proxy Host를 각각
`alcove_api:3000`, `minio:9000`으로 만든다. 한 hostname에서 direct
container 방식과 Nginx Proxy Manager 방식을 동시에 사용하지 않는다.

Mano Tunnel과 `grafana.mano.io.kr` hostname은 기존 설정을 유지한다.

```sh
cd ~/my_own_note
doppler run -- docker compose up -d \
  cloudflared-mano cloudflared-alcove
```

```sh
docker logs --tail=100 cloudflared-mano
docker logs --tail=100 cloudflared-alcove
```

## Alcove BE Doppler

`alcove_be/prd`에 다음 값을 설정한다.

```dotenv
CORS_ORIGIN=https://world-alcove.com
FRONTEND_ORIGIN=https://world-alcove.com
GOOGLE_OAUTH_CALLBACK_URI=https://world-alcove.com/auth/callback
GOOGLE_REDIRECT_URI=https://api.world-alcove.com/api/google/redirect
AUTH_COOKIE_SECURE=true
```

적용 후 API 컨테이너를 다시 시작한다.

```sh
docker restart alcove_api
```

## Google OAuth

Google Cloud Console의 OAuth client에 다음 값을 등록한다.

- Authorized JavaScript origin: `https://world-alcove.com`
- Authorized redirect URI:
  `https://api.world-alcove.com/api/google/redirect`

기존 주소는 전환 확인 전까지 유지하고, 새 주소에서 로그인 검증이 끝난 뒤
제거한다.

## Grafana

Grafana는 기존 `https://grafana.mano.io.kr` 도메인과 Tunnel/NPM 구성을
그대로 유지한다. `GRAFANA_ROOT_URL`도 기존 값을 변경하지 않는다.

## 확인

```sh
curl -I https://world-alcove.com
curl https://api.world-alcove.com/api/health-check
curl https://api.world-alcove.com/api/health-check/readiness
curl https://grafana.mano.io.kr/api/health
```

Google 로그인 후 브라우저 Network에서 `/api/user/me` 요청에
`alcove_access_token` 쿠키가 포함되고 응답이 HTTP 200인지 확인한다.
