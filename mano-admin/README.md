# Mano Admin

홈서버 서비스 관제와 공통 자동화 작업을 한곳에서 관리하는 개인용 포털입니다.
Grafana, File Browser, MinIO, n8n을 대체하지 않고 상태를 요약한 뒤 상세 관리는 각
서비스로 연결합니다.

## MVP 범위

- Overview: CPU, 메모리, 루트 디스크와 전체 서비스 상태
- Services: 정적 서비스 카탈로그, Prometheus 기반 상태, 바로가기
- Workspaces: Project A, Project T, Blog, YouTube, Freelancer별 Task와 주요 리소스 링크
- Workspace detail: 사이드바 독립 메뉴, 역할·책임·권장 흐름·최근 Task 안내 페이지
- Workspace editing: 상세 설명·흐름·Task 기준·리소스 링크를 페이지에서 직접 수정
- Tasks: 공통 작업 생성, 상세 입력, 상태/Reference/Artifact 관리
- Human-assisted workflow: ChatGPT/Codex 프롬프트 생성·복사와 결과/PR URL 저장
- Notes: Workspace, 태그, 고정 기능이 있는 개인 메모장과 검색
- Calendar: 개인 일정과 Task 마감일을 함께 표시하는 월간 달력
- Approvals: 대기 중인 작업의 승인과 거절
- Executions: 저장소별 Codex 실행, 테스트, PR, 수정 요청과 병합 검토
- `GET /api/health`: Admin 컨테이너 health endpoint

데이터는 Admin 전용 PostgreSQL에 저장합니다. Docker 제어, 파일 관리, 로그 검색,
n8n/Ollama를 직접 실행하지는 않습니다. Codex 자동화는 Mac Worker가 Admin의 실행
큐를 outbound polling하고 로컬 Codex/GitHub CLI 인증으로 수행합니다.

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

Mano Admin ──▶ mano-admin-postgres:5432
```

Admin은 Docker socket을 사용하지 않습니다. 브라우저도 Prometheus에 직접 접근하지
않으며 서버 컴포넌트가 사전에 정의된 PromQL만 실행합니다.

서비스 정의는 `src/config/services.ts`, 상태 조회는 `src/lib/prometheus.ts`, 공통
작업 데이터는 `src/lib/automation-repository.ts`에 분리되어 있습니다. 향후 n8n을
연결하더라도 화면에서 직접 호출하지 않고 `/api/automation/*` 경계를 사용합니다.

자세한 설계와 범위는 [docs/architecture.md](docs/architecture.md)를 참고하세요.

### Page guides

- [Overview](docs/pages/overview.md)
- [Services](docs/pages/services.md)
- [Workspaces](docs/pages/workspaces.md)
- [Tasks](docs/pages/tasks.md)
- [Approvals](docs/pages/approvals.md)
- [Runs](docs/pages/runs.md)
- [Security and health](docs/pages/security-and-health.md)
- [AI 자동화 설치와 사용법](docs/ai-automation.md)
- [n8n 연동 설정과 고도화](docs/n8n-automation.md)
- [Notes and Calendar](docs/pages/notes-and-calendar.md)

## Responsive layout

The same routes support desktop, tablet and mobile screens without a separate mobile app.

| Breakpoint | Layout behavior |
| --- | --- |
| Above `1180px` | Fixed sidebar, four metric/service columns where space allows |
| `761px`–`1180px` | Narrow sidebar, two-column metrics/cards and two-column Task form |
| Up to `760px` | Top horizontal navigation, one-column cards/forms/lists and touch-sized actions |
| Up to `430px` | Single-column metrics and stacked Workspace content/link buttons |

Horizontal filters and navigation scroll instead of shrinking below usable touch sizes. Task
status controls, approval buttons and Workspace links expand to the available mobile width. Task
detail fields and prompt panels collapse from two columns to one column at `760px`.

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

확장 프로그램 회귀 테스트는 저장소 상위의 `browser-extensions` 파일을 런타임 URL로
불러옵니다. Mano Admin Docker build context에는 `mano-admin`만 포함되므로 해당 파일을
TypeScript 정적 import로 연결하지 않습니다.

블로그 이웃 탐색의 기본 검색어는 네이버 관리의 `글 관리 > 태그` 화면에서 확장
프로그램의 `내 태그 수집`으로 동기화합니다. 태그는 중복·해시 기호·글 수 표기를
정리해 최대 200개까지 저장하고, 수동 키워드와 합쳐 검색 후보로 사용합니다. 기존
이웃과 사용자가 검색에서 제외한 블로그는 계속 내부적으로 걸러내지만 별도의
`검색 제외 목록` 편집 UI는 제공하지 않습니다.
태그 수집은 태그 관리 화면으로 판별된 iframe의 태그 전용 요소로 한정합니다. 네이버
공통 메뉴의 `#네이버게임`, `#날씨` 같은 서비스 링크는 제외하며, 태그 DOM을 찾지
못했을 때 페이지 전체 해시 텍스트로 대체하지 않습니다. 다시 수집하면 저장된 태그
배열 전체를 정상 결과로 교체하므로 과거에 섞인 메뉴 태그도 제거됩니다.

확장 프로그램의 Mano 주소는 origin(`https://admin.mano.io.kr`)만 사용합니다. 저장된
주소에 끝 슬래시나 경로가 있어도 API 요청 전 origin으로 정규화합니다. API가 JSON
대신 Cloudflare·404 HTML을 반환하면 확장은 HTTP 상태와 최종 요청 주소를 표시해
주소 오류와 미배포 API를 구분합니다.

블로그 수집 확장은 네이버 관리 화면의 iframe을 각각 검사합니다. 네이버 이웃 목록의
페이지 버튼은 클릭하면 주입된 수집 실행 자체가 끊길 수 있으므로 현재 페이지를
수집하며, 여러 페이지는 각 페이지에서 버튼을 한 번씩 누릅니다. 부분 페이지 결과는
기존 관계를 `사라짐`으로 바꾸지 않습니다. 댓글 관리는 메뉴 프레임과 댓글 행 프레임이
달라도 행을 합치고, 주소로 접근 가능한 숫자 페이지를 모두 순회합니다. 같은 글에서
내 블로그 ID의 댓글보다 먼저 작성된 상대 댓글은 답글 완료로 분류해 기존 미답글에서도
제거합니다. 주소 없는 페이지 버튼은 자동 이동하지 않고 부분 수집임을 결과에 표시합니다. 성장
스냅샷은 선택 날짜의 값만 합치고 통계 화면에서 제공하지 않는 방문자·게시글을 다른
날짜 값으로 채우지 않습니다. 각 값에는 `통계`, `블로그 홈`, `수동 입력` 출처를 함께
저장하며, 출처를 확인할 수 없는 과거 값과 실제로 관측되지 않은 지표는 Admin에서
`—`로 표시합니다.

성장 지표는 `blog.stat.naver.com`의 `statmain` iframe 결과를 우선합니다. Chrome이
통계 하위 프레임에 수집 함수를 주입하지 못할 때는 바깥 관리 페이지에서 iframe URL을
로그인 쿠키로 직접 읽어 선택 날짜와 조회수를 파싱합니다. 지표 값이 없는 바깥 통계
메뉴는 저장 후보로 선택하지 않습니다.

이웃 수집 버튼은 현재 `papermain` iframe만 신뢰하지 않고 저장된 블로그 ID를 사용해
범위별 네이버 관리 endpoint를 직접 읽습니다. `FOLLOWING`은 `BuddyListManage`,
`FOLLOWERS`는 `BuddyMeManage`, `REQUESTS`는 `BuddyInviteReceivedManage`에 대응합니다.
네이버 메뉴 선택 표시와 실제 iframe이 기본 설정 등으로 어긋나도 사용자가 누른 버튼의
범위만 저장하며, 블로그 URL과 `_param(...|blogId)` 양쪽 형식을 지원합니다.
같은 블로그가 `FOLLOWING`과 `FOLLOWERS` source scope를 모두 가지면 최종 관계는 수집
순서와 무관하게 `MUTUAL`이며, 신청 scope는 확정된 이웃 관계를 덮어쓰지 않습니다.
이웃 endpoint의 JavaScript 페이지네이션은 숨은 page 입력과 `currentPage`, `page`,
`pageNo` 후보 중 2페이지에서 실제 새 ID를 반환하는 파라미터를 선택해 끝까지 순회합니다.
따라서 첫 페이지 크기인 50명에서 FOLLOWING 수집이 멈추지 않습니다.

댓글 관리의 최근 상대시간은 수집 시각을 기준으로 절대시각으로 변환합니다. 댓글과 글
링크가 서로 다른 하위 요소에 있어도 가까운 상위 묶음에서 게시글 번호를 찾고, 번호를
확인하지 못한 항목은 잘못된 블로그 홈 주소로 저장하지 않습니다. iframe별 댓글 결과는
한 프레임만 고르지 않고 모두 병합하여 서버의 `게시글 ID + 작성자 + 작성 분` 중복 키와
같은 기준으로 정리합니다. 바깥 관리 페이지에서 댓글 본문 iframe이 확인되면 해당
`AdminNaverCommentManageView` 주소도 로그인 쿠키를 포함해 직접 읽어, Chrome의 하위
프레임 스크립트 주입 결과가 누락되어도 댓글 목록을 수집합니다.
과거 확장이 게시글 번호 없이 블로그 홈 주소로 만든 자동 수집 기록은 다음 댓글 수집
트랜잭션에서 삭제합니다. 잘못 합쳐진 답글 완료 상태는 유지하지 않고, 정확한 게시글
주소로 다시 수집된 항목만 미답글 여부를 새로 판정합니다.
댓글 본문에서는 `[글] 제목 -` 접두부와 정확히 반복된 문장을 제거합니다. 독립된 작성자
ID 줄이 없는 행은 닉네임 요소와 작성자 블로그 링크를 사용해 수집합니다.
동일 식별키의 기존 댓글도 다음 수집에서 정리된 본문과 정확한 글 주소로 갱신합니다.

Admin의 미답글 댓글함에는 `댓글 기록 초기화` 기능을 둡니다. 확인 대화상자를 통과한
경우에만 해당 blog workspace의 수집 댓글과 완료 기록을 모두 삭제하며, 성장 스냅샷과
이웃 관계 데이터는 삭제하지 않습니다. 초기화 후 확장에서 다시 수집할 수 있습니다.

댓글 중복 식별은 정규화한 `게시글 ID + 작성자 + 작성 분`을 사용합니다. 네이버의 서로
다른 iframe이 같은 댓글 본문을 일부만 읽거나 반복해서 읽어도 한 건으로 합치며, 여러
본문 후보가 있으면 먼저 저장된 기록을 유지합니다. 다음 수집 때 기존 중복도 정리합니다.

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
| `MANO_ADMIN_DB_PASSWORD` | 없음, 필수 | Admin 전용 PostgreSQL 비밀번호 |
| `MANO_ADMIN_DB_USER` | `mano_admin` | Admin DB 사용자 |
| `MANO_ADMIN_DB_NAME` | `mano_admin` | Admin DB 이름 |
| `MANO_ADMIN_DB_PORT` | `5434` | 홈서버에 공개할 Admin DB 포트 |
| `GITHUB_ACTIONS_TOKEN_ALCOVE` | 없음, 선택 | `Alcove-World-Official` Actions 조회·재실행 token |
| `GITHUB_ACTIONS_TOKEN_TONO` | 없음, 선택 | `TonoLab` Actions 조회·재실행 token |
| `GITHUB_ACTIONS_TOKEN_MANO` | 없음, 선택 | `ParkSuJeong74` Actions 조회·재실행 token |
| `NAVER_SEARCH_CLIENT_ID` | 없음, 선택 | NAVER API HUB 애플리케이션의 검색 API Client ID |
| `NAVER_SEARCH_CLIENT_SECRET` | 없음, 선택 | NAVER API HUB 애플리케이션의 검색 API Client Secret |
| `MANO_BLOG_INGEST_TOKEN` | 없음, 선택 | 네이버 댓글 수집 확장 프로그램 전용 Bearer token |
| `NTFY_BASE_URL` | `https://ntfy.sh` | ntfy 서버 URL |
| `NTFY_TOPIC` | 없음, 선택 | T1 경기 시작 알림을 받을 ntfy topic |
| `NTFY_TOKEN` | 없음, 선택 | 보호된 ntfy topic의 Bearer token |
| `GOOGLE_CALENDAR_CLIENT_ID` | 없음, 선택 | Google Calendar OAuth 웹 클라이언트 ID |
| `GOOGLE_CALENDAR_CLIENT_SECRET` | 없음, 선택 | Google Calendar OAuth 웹 클라이언트 secret 및 갱신 토큰 암호화 키 |
| `GOOGLE_CALENDAR_REDIRECT_URI` | `https://admin.mano.io.kr/api/integrations/google-calendar/callback` | Google OAuth에 등록한 정확한 HTTPS 콜백 주소 |
| `MANO_WORKER_TOKEN` | 없음, 필수 | Mac Codex Worker 전용 Bearer token |
| `MANO_N8N_TOKEN` | 없음, 필수 | n8n 전용 Mano API Bearer token |
| `N8N_AUTOMATION_WEBHOOK_SECRET` | 없음, 필수 | 자동화 이벤트 Webhook HMAC SHA-256 서명 키 |
| `N8N_AUTOMATION_WEBHOOK_URL` | `http://n8n:5678/webhook/mano-automation-events` | n8n 이벤트 수신 Webhook |

Google Calendar 양방향 동기화는 n8n에서 5분마다 `POST /api/integrations/google-calendar/sync`를 호출합니다. 요청에는 `Authorization: Bearer <MANO_N8N_TOKEN>` 헤더가 필요합니다. 최초 연결 시 기본 캘린더와 Google에서 선택한 구독 캘린더를 가져오고 이후에는 캘린더별 `syncToken`으로 변경분만 처리합니다. 기본 캘린더 일정은 양방향으로 동기화하고, 대한민국 공휴일 같은 구독 캘린더 일정은 Mano에서 읽기 전용으로 표시합니다.

### Google 일정 가져오기 검증

- 연동 범위는 연결 계정의 기본 캘린더(`primary`)와 Google 캘린더 목록에서 선택된 구독 캘린더이다.
- 대한민국 공휴일 등 구독 캘린더는 Google 원본을 기준으로 가져오며 Mano에서 수정·삭제하거나 Google로 다시 전송하지 않는다.
- 캘린더 화면 진입 시 마지막 가져오기 후 1분이 지났다면 Google 변경분을 증분 동기화한다.
- `Google 일정 동기화` 버튼은 누락된 기존 일정까지 찾기 위해 전체 동기화를 실행한다.
- Google에서 만든 일정은 `google_event_id`로 식별하며, 이후 Google에서 제목·설명·시간을 수정하거나 삭제한 내용도 Mano에 반영한다.
- 장애 확인 시 `google_calendar_connection.last_pulled_at`, `calendar_events.google_event_id`, `admin_error_logs`의 `GOOGLE-CALENDAR-*` 기록을 함께 확인한다.
- 검증 테스트는 빈 캘린더, 신규 일정, 기존 일정 수정·삭제, 반복·종일 일정, 만료된 `syncToken`, 여러 페이지 응답, 선택된 구독 캘린더와 읽기 전용 처리를 포함한다.

기본값은 현재 Mano Tunnel의 Published application 주소와 일치합니다. 실제 홈서버
도메인이 달라지면 Doppler `mano/prd`에서 덮어씁니다. Admin에는
GitHub Actions 연동을 사용할 때만 저장소 범위를 제한한 token을 주입하며 Docker 권한은 주입하지 않습니다.

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

정상 로그인 후에도 `403`이 나오면 토큰이나 이메일 값을 출력하지 않는 다음 로그를
확인합니다.

```bash
docker compose logs --tail=100 mano-admin
```

| 로그 code/claim | 확인할 설정 |
| --- | --- |
| `ERR_JWKS_NO_MATCHING_KEY` | `CF_ACCESS_TEAM_DOMAIN`이 현재 Zero Trust team인지 확인 |
| `ERR_JWT_CLAIM_VALIDATION_FAILED`, `claim: aud` | Admin application의 AUD를 `CF_ACCESS_AUD`에 넣었는지 확인 |
| `ERR_JWT_CLAIM_VALIDATION_FAILED`, `claim: iss` | team domain을 `https://<team>.cloudflareaccess.com` 형식으로 확인 |
| `ERR_ACCESS_IDENTITY_NOT_ALLOWED` | Access 로그인 이메일과 `CF_ACCESS_ALLOWED_EMAIL` 확인 |
| `ERR_JWS_SIGNATURE_VERIFICATION_FAILED` | 다른 Cloudflare account/application token인지 확인 |
| `ERR_JWKS_TIMEOUT` 또는 fetch 계열 | Admin 컨테이너에서 Cloudflare JWKS outbound 연결 확인 |

```bash
docker exec mano-admin sh -c \
  'wget -qO- "$CF_ACCESS_TEAM_DOMAIN/cdn-cgi/access/certs" >/dev/null'
```

## 상태 판정

- `healthy`: Prometheus query가 시계열을 반환하고 값이 모두 `1`
- `unhealthy`: 시계열이 존재하지만 하나 이상의 값이 `1`이 아님
- `unknown`: 해당 서비스 query가 없거나 Prometheus 조회가 실패하거나 데이터가 없음

n8n, Prometheus, Loki, Alloy는 기존 scrape target의 `up`을 사용합니다. Grafana,
File Browser, MinIO는 자체 scrape 데이터가 없어 `my_own_note`의 기존 Blackbox
Exporter에 내부 health probe를 추가합니다. Nginx Proxy Manager는 이번 MVP에서
별도 probe를 만들지 않아 `unknown`으로 표시됩니다.

## 작업 데이터와 API 경계

핵심 데이터 모델은 `Workspace`, `Task`, `Repository`, `Execution`, `PullRequest`,
`Approval`, `Artifact`입니다.
앱 컨테이너 시작 시 `db/schema.sql`을 idempotent하게 적용합니다. 공개 저장소의
스키마에는 개인 워크스페이스, 저장소, 작업, 링크 등의 운영 데이터를 seed하지
않으며, 해당 데이터는 Admin UI에서 별도로 등록합니다.

| Method | Endpoint | 용도 |
| --- | --- | --- |
| `GET`, `POST` | `/api/automation/tasks` | Task 조회·생성 |
| `PATCH` | `/api/automation/tasks/:id` | Task 상태 callback |
| `GET` | `/api/automation/approvals` | 승인 목록 |
| `PATCH` | `/api/automation/approvals/:id` | 승인·거절 |
| `GET`, `POST` | `/api/automation/runs` | 실행 이력 조회·생성 |
| `PATCH` | `/api/automation/runs/:id` | 실행 상태·요약 callback |

일반 API는 UI와 동일하게 Cloudflare Access JWT가 필요합니다. `/api/worker/*`는
Cloudflare 사용자 JWT 대신 별도 `MANO_WORKER_TOKEN`을 검증합니다. 공개 hostname을
사용하는 Worker는 Cloudflare Service Token도 함께 보내야 합니다.

Artifact의 `path`는 `/files/blog/...` 같은 메타데이터만 표시합니다. Admin은 파일을
읽거나 쓰지 않으며 File Browser/n8n 공유 디렉터리를 마운트하지 않습니다.

Project A/T의 API Docs, Admin, Frontend와 Notion 바로가기는 Workspace의 `links`
JSONB 메타데이터로 관리합니다. 새 프로젝트 링크도 같은 구조에 추가합니다.

## 운영 확인

```bash
docker compose ps mano-admin
docker compose logs --tail=100 mano-admin
docker compose logs --tail=100 mano-admin-postgres
curl http://127.0.0.1:3100/api/health
```

Prometheus에서 다음 query를 확인할 수 있습니다.

```promql
up{job=~"n8n|prometheus|loki|alloy"}
probe_success{job="blackbox-http", project="mano"}
```

`mano_admin_postgres_data`는 운영 데이터이므로 Docker volume 백업 대상입니다.

Admin DB는 다른 프로젝트 PostgreSQL과 같은 방식으로 호스트에 공개됩니다. Docker
내부에서는 `mano-admin-postgres:5432`, Tailscale에서는 홈서버 IP의 기본 포트
`5434`를 사용합니다.

```text
Host: 100.65.169.121
Port: 5434
Database: mano_admin
User: mano_admin
Password: MANO_ADMIN_DB_PASSWORD
```

호스트에서 `5434`가 이미 사용 중이면 Doppler `mano/prd`의
`MANO_ADMIN_DB_PORT`를 다른 미사용 포트로 변경합니다.
