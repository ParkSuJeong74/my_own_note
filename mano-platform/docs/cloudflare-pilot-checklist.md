# Cloudflare Pilot 운영 체크리스트

이 체크리스트는 `OPS-002`, `OPS-003`, `OPS-005`, `OPS-006`에 따라 `next.mano.io.kr` Pilot을
준비하고 검증할 때 사용한다. 실행 자체는 배포 및 DNS 변경 승인을 받은 뒤 수행한다.

## 최초 배포 전

- [ ] `mano-preview` GitHub Environment에 승인자를 지정한다.
- [ ] Environment secret `CLOUDFLARE_API_TOKEN`과 variable `CLOUDFLARE_ACCOUNT_ID`를 등록한다.
- [ ] 토큰 권한을 대상 Account의 Worker 편집과 `mano.io.kr` Zone의 필요한 범위로 제한한다.
- [ ] Cloudflare Zone의 DNS 레코드를 기존 가비아 DNS와 대조한다.
- [ ] `next.mano.io.kr`에 충돌하는 A, AAAA, CNAME 레코드가 없는지 확인한다.
- [ ] Worker 생성 직후 **Workers & Pages → mano-platform → Access**에서 Worker 보호를 활성화한다.
- [ ] 범위를 **All traffic**으로 지정해 `workers.dev`, Preview URL, Custom Domain을 모두 보호한다.
- [ ] Mano Admin과 같은 identity provider 및 이메일 One-time PIN 방식을 선택한다.
- [ ] 별도 `Mano Platform Pilot` Access 애플리케이션에 `Allow` 정책 하나만 둔다.
- [ ] **Include → Emails**에 Mano Admin과 같은 본인 이메일 주소 한 개만 등록한다.
- [ ] `Everyone`, 이메일 도메인 전체 허용, `Bypass` 및 불필요한 `Service Auth` 정책이 없는지 확인한다.
- [ ] 새 애플리케이션의 AUD를 기록하되 기존 Mano Admin AUD와 서로 다른지 확인한다.
- [ ] 기존 Origin에서 JSON 백업을 내려받아 파일이 열리는지 확인한다.

## 배포 및 데이터 확인

- [ ] 전용 workflow의 validate job이 모두 통과한 커밋 SHA를 기록한다.
- [ ] `*.workers.dev` 주소에서 첫 화면과 정적 자산 응답을 확인한다.
- [ ] `next.mano.io.kr` Custom Domain과 TLS 인증서가 Active인지 확인한다.
- [ ] 로그아웃 상태에서 `workers.dev`와 `next.mano.io.kr` 모두 Access 로그인으로 이동하는지 확인한다.
- [ ] Mano Admin과 같은 이메일 OTP로 로그인한 뒤 두 주소에 접근할 수 있는지 확인한다.
- [ ] 다른 이메일로 인증했을 때 두 주소 모두 거부되는지 확인한다.
- [ ] 새 Origin에서 JSON 백업을 복원하고 노트 수, 제목, 본문을 원본과 비교한다.
- [ ] 페이지 생성, 이름 변경, 이동, 휴지통, 검색, 백업 재내보내기를 확인한다.
- [ ] 데스크톱과 모바일 브라우저에서 새로고침 후 데이터가 유지되는지 확인한다.

## 실패 및 롤백

- [ ] 문제가 있으면 `next.mano.io.kr` Custom Domain 연결을 해제한다.
- [ ] Cloudflare Workers 배포 이력에서 직전 정상 버전으로 롤백한다.
- [ ] 로컬 데이터가 손상된 경우 기존 JSON 백업을 새 Origin에 다시 복원한다.
- [ ] `mano.io.kr`과 기존 홈서버가 영향을 받지 않았는지 확인한다.

`mano.io.kr` 전환, DNS 네임서버 변경, Access 정책 변경은 이 체크리스트의 자동 작업이 아니며
각각 별도 승인을 받고 수행한다.
