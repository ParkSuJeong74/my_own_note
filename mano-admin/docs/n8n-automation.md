# n8n 연동 설정과 활용

n8n은 Codex를 직접 실행하지 않습니다. Mano의 이벤트를 받아 알림과 후속 작업을 처리하고, 실행 시간이 된 READY Task를 Queue에 등록합니다. Codex·Git·테스트·PR은 Mac Worker가 담당합니다.

## 환경변수

서로 다른 값을 생성합니다.

```bash
openssl rand -hex 32 # MANO_N8N_TOKEN
openssl rand -hex 32 # N8N_AUTOMATION_WEBHOOK_SECRET
```

Doppler `mano/prd`에 저장합니다.

```dotenv
MANO_N8N_TOKEN=<n8n 전용 API token>
N8N_AUTOMATION_WEBHOOK_SECRET=<webhook HMAC secret>
N8N_AUTOMATION_WEBHOOK_URL=http://n8n:5678/webhook/mano-automation-events
```

Worker token과 n8n token은 용도가 다르므로 같은 값을 재사용하지 않습니다.

## 워크플로 Import

n8n에서 우측 상단 메뉴의 **Import from File**로 다음 파일을 가져옵니다.

1. `automation/n8n/workflows/mano-automation-events.json`
2. `automation/n8n/workflows/mano-scheduled-queue.json`

먼저 `Mano - Automation Event Router`를 활성화합니다. Production Webhook 경로가 `mano-automation-events`인지 확인합니다. 그다음 `Mano - Scheduled AI Queue and Event Retry`를 한 번 수동 실행해 모든 노드가 성공하는지 확인하고 활성화합니다.

## 이벤트 Router

Mano는 다음 이벤트를 Outbox에 먼저 저장하고 n8n으로 보냅니다.

- `task.queued`
- `execution.running`
- `execution.review`
- `execution.failed`
- `execution.revision_requested`
- `execution.retried`
- `execution.merged`

Webhook에는 `X-Mano-Signature: sha256=...`가 포함됩니다. Import 워크플로의 `Verify HMAC` 노드가 `N8N_AUTOMATION_WEBHOOK_SECRET`으로 검증합니다. 프롬프트, 실행 로그, 토큰은 Webhook payload에 포함하지 않습니다.

`Build Notification` 뒤에 원하는 알림 노드를 연결할 수 있습니다.

- Telegram: `Send Message`
- Slack/Discord: Webhook 또는 메시지 노드
- Gmail: 실패·검토 요청 메일
- Google Calendar: 배포 검토 일정 생성

외부 알림이나 API 작업은 `eventKey`를 저장해 같은 이벤트가 재전송되더라도 한 번만 처리하도록 구성하는 것을 권장합니다.

## 예약 실행 조건

매분 실행되는 스케줄 워크플로는 아래 조건을 모두 만족하는 Task만 Queue에 넣습니다.

1. AI Automation이 활성화된 Workspace
2. 상태가 `READY`
3. Due date가 존재
4. Due date가 현재 시각 이전
5. 대상 Repository가 하나 이상
6. 이미 활성 Execution이 없음

따라서 자동 실행하려면 Task 상세에서 대상 저장소와 Due date를 저장한 뒤 상태를 READY로 변경합니다. 날짜 없는 Task와 DRAFT Task는 자동 실행되지 않습니다.

## 장애 복구

n8n이 내려가 있어도 Mano 실행은 계속됩니다. 이벤트는 `automation_events`에 PENDING으로 남습니다. 스케줄 워크플로의 `Retry Pending Events` 노드가 매분 재전송하며, Admin의 `Integrations` 페이지에서도 수동 재전송할 수 있습니다.

## n8n 전용 API

모든 요청에 `Authorization: Bearer $MANO_N8N_TOKEN`이 필요합니다.

| Method | Endpoint | 설명 |
| --- | --- | --- |
| `GET` | `/api/integrations/n8n/tasks` | 실행 시간이 된 READY Task 목록 |
| `POST` | `/api/integrations/n8n/tasks/:id/queue` | Task의 저장소별 Execution 생성 |
| `GET` | `/api/integrations/n8n/events?after=0` | 이벤트 pull fallback |
| `POST` | `/api/integrations/n8n/dispatch` | PENDING Webhook 재전송 |
| `POST` | `/api/t1/sync` | T1 일정·스코어·밴픽 동기화 |

Docker 내부에서는 `http://mano-admin:3000`을 base URL로 사용합니다. 위 n8n 전용 API와 Worker API만 Cloudflare Access 검증을 거치지 않으며, 각 route의 Bearer token 검증은 항상 적용됩니다. 일반 Admin 화면과 API에는 기존 Cloudflare Access 인증이 계속 적용됩니다.

## 다음 고도화 후보

1. `REVIEW` 이벤트를 Telegram으로 보내고 승인 링크 제공
2. 실패 원인을 테스트·인증·dirty repository·Codex 오류로 분류해 알림 채널 분기
3. GitHub CI 성공 이벤트를 받은 뒤에만 병합 버튼 활성화
4. Daily/Monthly Todo 완료율과 오늘 Due Task를 아침 요약으로 발송
5. Calendar 반복 일정에서 점검 Task를 자동 생성하는 Template 기능
6. Codex 실행 시간과 토큰/비용을 프로젝트별로 집계
7. Dependabot·보안 스캔 결과를 Task로 자동 등록
8. 홈서버 백업 실패, 디스크 임계치, 인증서 만료를 Mano Task와 연결
