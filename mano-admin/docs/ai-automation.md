# Mano AI 자동화 사용법

Mano Admin은 작업을 저장하고 Mac Worker가 outbound polling으로 가져가게 합니다. 홈서버가 Mac에 SSH로 접속하지 않으며, GitHub와 Codex 자격 증명은 Mac에만 둡니다.

## 1. Admin 환경변수

충분히 긴 임의 토큰을 만들고 Doppler `mano/prd`와 Mac에 같은 값을 저장합니다.

```bash
openssl rand -hex 32
```

```dotenv
MANO_WORKER_TOKEN=<생성한 값>
```

홈서버를 배포하면 `db/schema.sql`이 실행 큐와 Worker 테이블을 자동 생성합니다.

## 2. Mac 준비

Node.js 20.9 이상, Git, GitHub CLI, Codex CLI가 필요합니다. 각각 한 번 로그인합니다.

```bash
gh auth login
codex login
gh auth status
codex --version
```

Worker는 기존 로그인 정보를 사용하므로 GitHub/OpenAI 토큰을 Admin DB에 저장하지 않습니다.

## 3. 저장소 경로 설정

```bash
cd /Users/sujeongpark/workspace/my_own_note/mano-admin
cp worker.config.example.json worker.config.json
```

`worker.config.json`에서 GitHub의 `owner/repo`와 Mac의 실제 clone 경로, 검증 명령을 맞춥니다. 이 파일은 `.gitignore`에 포함됩니다. Worker가 실행하기 전 각 저장소는 변경사항이 없는 clean 상태여야 합니다.

## 4. Worker 실행

Tailscale로 홈서버 origin에 연결할 수 있다면 이 방식을 권장합니다.

```bash
export MANO_ADMIN_URL=http://100.65.169.121:3100
export MANO_WORKER_TOKEN='<같은 토큰>'
export MANO_WORKER_ID='sujeong-macbook'
npm run worker
```

공개 `https://admin.mano.io.kr`을 사용하면 Cloudflare Access Service Token도 지정합니다.

```bash
export MANO_ADMIN_URL=https://admin.mano.io.kr
export CF_ACCESS_CLIENT_ID='<service-token-id>'
export CF_ACCESS_CLIENT_SECRET='<service-token-secret>'
npm run worker
```

Worker는 7초마다 polling하며 작업이 없으면 아무 변경도 하지 않습니다. 종료는 `Ctrl+C`입니다.

## 5. Admin 최초 설정

1. 사이드바 `AI Instructions`에서 모든 프로젝트에 공통인 안전 지침을 등록합니다.
2. `Workspaces > 프로젝트 > AI Automation`에서 자동화를 켭니다.
3. GitHub 저장소 URL과 기본 브랜치를 등록합니다.
4. Workspace 지침을 작성하고 필요한 경우 Repository 지침도 추가합니다.
5. Task를 만들고 상세 화면의 `Target repositories`에서 대상 저장소를 체크합니다.

실제 프롬프트는 Global → Workspace → Repository → Task → 수정 요청 순으로 합쳐지며, 실행 당시 내용이 snapshot으로 저장됩니다.

## 6. 작업 실행과 검토

1. 사이드바 `Executions`에서 Task를 선택하고 `Queue executions`를 누릅니다.
2. 선택한 저장소마다 Execution 하나가 생성됩니다.
3. Worker는 저장소를 fetch하고 clean 상태를 검사한 뒤 전용 브랜치를 만듭니다.
4. Codex가 코드를 수정하고 설정된 테스트를 실행합니다.
5. 성공하면 commit/push 후 Pull Request를 만들고 상태가 `REVIEW`가 됩니다.
6. Admin에서 Summary, Tests, log와 PR을 확인합니다.
7. 보완이 필요하면 `Request revision`을 누릅니다. 같은 브랜치와 Codex thread로 다시 실행됩니다.
8. 일반 프로젝트는 `Approve & merge`로 squash merge합니다.

동일 저장소에는 한 번에 하나의 Worker만 접근합니다. Worker가 중단되면 2분 lease 만료 후 claim 단계 작업은 다시 대기열로 돌아갑니다. 실행 중 실패한 항목은 `Retry execution`으로 다시 시작할 수 있습니다.

## 7. Infrastructure 프로젝트

`Mano`처럼 `INFRASTRUCTURE`인 프로젝트는 Admin에서 자동 병합하지 않습니다. PR 검토 후 GitHub에서 직접 병합하고, Admin에서 `Mark merged`를 눌러 완료 처리합니다. 배포, `docker compose down`, 볼륨 삭제, DB migration 실행, secret 변경은 이 Worker의 자동 실행 범위가 아닙니다.

## 상태 의미

- `QUEUED`: Worker 대기
- `CLAIMED`: Worker가 가져갔지만 Codex 시작 전
- `RUNNING`: Codex 또는 테스트 실행 중
- `REVIEW`: PR 검토 대기
- `FAILED`: 실행 실패, 오류 확인 후 재시도 가능
- `SUCCEEDED`: PR 병합과 Task 완료
- `CANCELLED`: 취소됨

## 문제 해결

- `No local path configured`: `worker.config.json`의 owner/repo 키 확인
- `Repository has uncommitted changes`: 해당 clone의 변경사항을 먼저 commit/stash
- `codex exited`: `codex login`, 저장소 지침, 실행 log 확인
- `gh exited`: `gh auth status`와 조직 저장소 권한 확인
- Worker API `401`: Admin과 Mac의 `MANO_WORKER_TOKEN` 일치 여부 확인
- 공개 URL에서 HTML 로그인 응답: Cloudflare Service Token 헤더 설정 또는 Tailscale origin 사용

n8n 스케줄과 알림을 연결하려면 [n8n 연동 설정과 활용](n8n-automation.md)을 참고합니다.
