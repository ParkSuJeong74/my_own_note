# CI/CD 및 Cloudflare 배포 계획

## 1. 목적

새 Mano를 기존 서비스와 분리해 검증하고, 검증된 산출물만 Cloudflare Workers에 배포한다.
초기에는 기존 `mano.io.kr`을 변경하지 않고 별도 호스트에서 운영 검증한다.

이 문서는 배포 구조와 작업 순서, 저장소 안의 배포 설정을 정의한다. 저장소에는 GitHub Actions와
Cloudflare Worker 설정을 추가하지만, 명시적 승인 전에는 실제 Worker 배포나 DNS 변경을 수행하지
않는다.

### 구현 요구사항

| ID | 요구사항 | 검증 방법 |
| --- | --- | --- |
| OPS-001 | `mano-platform/**` 변경만 새 플랫폼 CI 검증 대상으로 삼는다. | workflow 경로 필터와 로컬 release 검사 |
| OPS-002 | `master` push에서 Pilot Worker 배포를 준비하되 보호 규칙이 설정된 GitHub Environment와 비밀값을 사용한다. | workflow 구문 및 environment/secret 참조 검사 |
| OPS-003 | `next.mano.io.kr`을 Custom Domain으로 선언하고 `mano.io.kr`은 변경하지 않는다. | Wrangler 설정 정적 검사 |
| OPS-004 | 기존 홈서버 workflow는 `mano-platform/**`만 바뀐 경우 실행하지 않는다. | 기존 workflow `paths-ignore` 검사 |
| OPS-005 | 배포 전 기존 Origin의 JSON 백업과 새 Origin 복원 확인을 운영 체크리스트에 둔다. | 체크리스트 문서 검사 |
| OPS-006 | Mano Admin과 같은 이메일 OTP 정책으로 Worker의 모든 공개 주소를 보호하되 Access 애플리케이션과 AUD는 분리한다. | Access 설정 및 비인가 접근 체크리스트 검사 |

## 2. 현재 상태와 결론

- 새 애플리케이션은 `mano-platform` 안에서 로컬 검사와 프로덕션 빌드가 가능하다.
- 부모 저장소의 기존 `.github/workflows/deploy.yml`은 `mano-admin`만 검사한다.
- 기존 홈서버 workflow에는 `mano-platform/**` 전용 변경을 제외하는 경로 필터를 추가했다.
- 홈서버 배포 스크립트는 `mano-platform`을 빌드하거나 실행하지 않는다.
- 새 플랫폼 workflow는 PR에서 검사하고, `master`의 관련 변경만 `mano-preview` Environment를
  거쳐 Pilot Worker에 배포하도록 구성했다.

**결론:** 저장소 설정은 완료됐다. 실제 실행 전 GitHub Environment의 보호 규칙과 Cloudflare
비밀값, Zone, Access 정책을 준비해야 하며 이번 작업에서는 배포하지 않는다.

## 3. 배포 대상

| 단계 | 호스트 예시 | 용도 | 공개 범위 |
| --- | --- | --- | --- |
| Preview | Worker의 `workers.dev` 주소 | 최초 배포와 스모크 테스트 | Cloudflare Access 권장 |
| Pilot | `next.mano.io.kr` | 실제 기기·브라우저 검증 | Cloudflare Access 권장 |
| Production | `mano.io.kr` | 추후 기존 서비스 대체 | 별도 전환 승인 필요 |

Pilot 호스트는 `next.mano.io.kr`로 확정한다. 최종 Production 전환은 별도 승인 단위다.

## 4. 런타임 선택

Cloudflare의 현재 Next.js 공식 가이드는 Workers 배포에 `vinext`를 기본 경로로 안내한다.
OpenNext는 대안이지만 새 구성에서는 우선 선택하지 않는다.

구현 및 검증 작업은 다음과 같다.

1. `mano-platform/apps/web`에서 `pnpx vinext check`로 호환성을 확인한다.
2. `pnpx vinext init`으로 Vite 및 Worker 설정을 생성한다.
3. 로컬에서 vinext 개발 서버와 프로덕션 빌드를 검증한다.
4. `workers.dev`에 먼저 배포하고 브라우저 스모크 테스트를 수행한다.
5. 검증 후 Custom Domain을 연결한다.

참고: [Cloudflare Next.js on Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/)

## 5. CI 설계

Pull Request 및 `mano-platform/**` 변경에 대해 아래 검증을 수행한다.

1. Node.js 22와 pnpm 10.12.4 설치
2. `pnpm install --frozen-lockfile`
3. `pnpm check`
4. Playwright Chromium 설치
5. `pnpm --filter @mano/web test:e2e`
6. vinext 호환성 검사와 Workers용 프로덕션 빌드

workspace 소비자는 `@mano/editor-core`와 `@mano/contracts`의 `dist` export를 사용하므로
새 runner에서는 typecheck 전에 반드시 `pnpm build:workspace-deps`를 실행한다. 특히 API가
`@mano/contracts`를 import하는 경우 로컬의 과거 `dist`가 문제를 가릴 수 있으므로 clean
install을 기준으로 검증한다. 이를 누락하지 않도록 `pnpm check`와 Cloudflare build 모두
루트의 workspace dependency build를 사용한다.

예상 명령은 다음과 같다.

```bash
cd mano-platform
corepack enable
pnpm install --frozen-lockfile
pnpm check
pnpm --filter @mano/web exec playwright install --with-deps chromium
pnpm --filter @mano/web test:e2e
pnpm --filter @mano/web check:vinext
pnpm build:cloudflare
```

기존 홈서버 워크플로와 새 플랫폼 워크플로에는 각각 경로 조건을 둔다.

- 새 플랫폼 CI/CD: `mano-platform/**`
- 기존 홈서버 검증·배포: 기존 서비스와 인프라 경로만 포함하고 `mano-platform/**` 제외

## 6. CD 설계

### Preview

- `master` 병합 후 새 플랫폼 변경이 있을 때만 실행한다.
- Wrangler 설정은 `workers.dev`와 `next.mano.io.kr` Custom Domain을 함께 선언한다.
- 배포 전 Access와 DNS 준비를 끝내고, 배포 성공 후 두 주소의 상태 및 핵심 페이지를 확인한다.
- Preview 실패는 Production 배포를 막는다.

### Production

- 자동 배포하지 않는다.
- 이번 workflow에는 Production 배포 job과 `mano.io.kr` 라우트를 넣지 않는다.
- 추후 별도 작업에서 GitHub Actions의 `workflow_dispatch`와 `mano-production` Environment 승인을
  추가한다.
- 승인된 커밋 SHA를 그대로 배포해 CI에서 검증한 코드와 배포 코드를 일치시킨다.

GitHub Environment 참고:
[Deployment environments](https://docs.github.com/en/actions/concepts/workflows-and-actions/deployment-environments)

### GitHub에 사용자가 등록할 값

| 위치 | 이름 | 종류 | 설명 |
| --- | --- | --- | --- |
| `mano-preview` Environment | `CLOUDFLARE_API_TOKEN` | Secret | Preview Worker 배포용 최소 권한 토큰 |
| `mano-preview` Environment | `CLOUDFLARE_ACCOUNT_ID` | Variable | Cloudflare 계정 ID |
| 향후 `mano-production` Environment | `CLOUDFLARE_API_TOKEN` | Secret | Production 전환 때 별도 등록할 토큰 |
| 향후 `mano-production` Environment | `CLOUDFLARE_ACCOUNT_ID` | Variable | Production 전환 때 별도 등록할 계정 ID |

토큰이나 계정 ID는 저장소 파일, 로그, 예제 환경 파일에 기록하지 않는다. Preview와 Production의
토큰은 분리하며, Worker 편집과 필요한 Zone 권한만 허용한다.

## 7. Cloudflare 라우트 설정

새 Mano Worker 자체가 원본 서버이므로 **Worker Route가 아니라 Custom Domain**을 사용한다.
Worker Route는 별도의 원본 서버 앞에서 일부 요청만 가로챌 때 사용한다.

### Cloudflare Zone이 아직 없는 경우

1. Cloudflare에서 `mano.io.kr` 사이트를 추가한다.
2. 가져온 DNS 레코드를 현재 가비아 DNS와 한 줄씩 비교한다.
3. 메일, 기존 Mano, 홈서버, 인증용 TXT 레코드가 빠지지 않았는지 확인한다.
4. 가비아에서 네임서버를 Cloudflare가 지정한 값으로 변경한다.
5. Cloudflare에서 Zone 상태가 `Active`가 될 때까지 기다린다.

네임서버 변경은 기존 서비스 전체에 영향을 줄 수 있으므로 DNS 비교와 별도 승인을 마친 뒤
사용자가 직접 수행한다.

### Custom Domain 연결

1. Worker를 `workers.dev`에 배포하고 먼저 동작을 확인한다.
2. Cloudflare Dashboard에서 **Workers & Pages → 대상 Worker → Settings → Domains & Routes**로
   이동한다.
3. **Add → Custom Domain**을 선택한다.
4. `next.mano.io.kr`을 입력하고 연결한다.
5. Cloudflare가 생성한 DNS와 TLS 인증서 상태를 확인한다.

동일 호스트 이름에 기존 CNAME이 있으면 Custom Domain을 바로 추가할 수 없다. 기존 레코드의
용도를 확인한 후 충돌을 해소해야 한다.

배포 설정은 `apps/web/wrangler.jsonc`에서 관리하며 다음 형태를 기준으로 한다.

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "mano-platform",
  "routes": [
    {
      "pattern": "next.mano.io.kr",
      "custom_domain": true
    }
  ]
}
```

Wrangler 설정을 생성한 뒤에는 이를 라우팅의 기준으로 사용한다. Dashboard에서 임의로 변경한
라우트는 다음 배포에서 설정 파일의 값으로 다시 바뀔 수 있다.

참고:

- [Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
- [Worker Routes](https://developers.cloudflare.com/workers/configuration/routing/routes/)
- [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)

## 8. 개인용 Pilot 보호

현재는 개인용이므로 Mano Admin과 동일한 Cloudflare Access 이메일 One-time PIN 로그인을
사용한다. 동일한 Zero Trust 팀, identity provider, 본인 이메일을 재사용하되 `mano-platform`
Worker 전용 Access 애플리케이션을 생성한다. 기존 Mano Admin 애플리케이션의 AUD는 재사용하지
않는다.

Worker가 생성된 뒤 **Workers & Pages → mano-platform → Access → Protect this Worker behind
Access**에서 **All traffic**을 선택한다. 이렇게 하면 `workers.dev`, Preview URL,
`next.mano.io.kr` Custom Domain이 한 정책으로 보호된다. 정책은 `Allow` 하나만 만들고
**Include → Emails**에 본인의 정확한 이메일 주소 한 개를 지정한다. `Everyone`, 이메일 도메인
전체, `Bypass` 정책은 사용하지 않는다.

현재 Pilot에는 서버 API나 권한별 데이터가 없고 모든 노트가 브라우저 `localStorage`에 있으므로
앱 내부에서 Access JWT를 다시 검증하지 않는다. 추후 서버 API나 동기화를 추가할 때는 Mano
Admin과 같은 방식으로 `Cf-Access-Jwt-Assertion`의 RS256 서명, issuer, 새 애플리케이션 AUD,
token type, 허용 이메일을 검증하고 설정 누락 시 fail-closed 처리한다.

참고: [Cloudflare Access for Workers](https://developers.cloudflare.com/workers/configuration/cloudflare-access/)

## 9. 데이터 주의사항

현재 노트 데이터는 브라우저 `localStorage`에 저장된다. `localhost`, 기존 도메인,
`workers.dev`, `next.mano.io.kr`은 서로 다른 Origin이므로 저장 데이터가 자동으로 공유되지
않는다.

- Pilot 이동 전 기존 화면에서 JSON 백업을 내보낸다.
- 새 도메인에서 JSON을 가져온 뒤 노트 수와 본문을 확인한다.
- 서버 동기화가 구현되기 전에는 이 절차를 배포 체크리스트에 유지한다.

## 10. 배포 및 롤백 순서

1. 전용 CI가 모두 통과한다.
2. Preview Worker에 배포한다.
3. 로그인/Access, 페이지 생성, 이름 변경, 이동, 휴지통, 검색, 백업 복원을 확인한다.
4. Pilot Custom Domain을 연결한다.
5. 데스크톱과 모바일에서 같은 스모크 테스트를 수행한다.
6. 장애 시 Custom Domain 연결을 해제하고 직전 정상 Worker 버전으로 롤백한다.
7. 기존 `mano.io.kr` 전환은 데이터 동기화와 인증이 준비된 뒤 별도 작업으로 진행한다.

실행 시에는 [Cloudflare Pilot 운영 체크리스트](cloudflare-pilot-checklist.md)를 사용한다.

## 11. 완료 범위와 다음 승인 단위

이번 작업에서 완료한 항목:

- vinext 호환성 검사 및 설정 생성
- 새 플랫폼 전용 GitHub Actions 작성
- 기존 홈서버 워크플로 경로 분리
- 배포 전 로컬 테스트, 타입 검사, Next.js 및 vinext 빌드
- Cloudflare 설정 파일과 운영 체크리스트 작성

사용자가 수행하거나 제공해야 하는 작업:

- Cloudflare Zone과 현재 DNS 레코드 확인
- GitHub Environment에 Cloudflare 비밀값 등록
- Cloudflare Access 허용 이메일 설정
- Pilot 배포와 Production 전환 각각의 명시적 승인
