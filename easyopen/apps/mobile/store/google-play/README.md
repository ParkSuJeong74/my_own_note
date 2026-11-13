# EasyOpen Google Play 내부 테스트 준비

첫 내부 테스트 후보는 앱 버전 `0.1.1-beta.2`, `versionCode 3`, GitHub tag
`easyopen-v0.1.1-beta.2`입니다. 세 값은 임의로 섞지 않습니다.

CI의 `Build/Release Desktop/Android apps` workflow를 `release_scope=android`, `publish=true`로 실행하면 동일 릴리스 키로 서명된 APK와 `*-play.aab`를 생성합니다. AAB는 Play Console 내부 테스트 트랙에 업로드하고 APK는 GitHub 설치 대체 경로로 사용합니다.

실행 입력은 다음 값으로 고정합니다.

```yaml
release_scope: android
publish: true
release_tag: easyopen-v0.1.1-beta.2
```

GitHub Actions repository secret에는 Doppler `mano/prd` read-only Service Token인
`DOPPLER_TOKEN`이 있어야 합니다. Android 서명키 네 값은 GitHub에 각각 복사하지 않고
`mano/prd`에서 workflow 실행 중 조회합니다. 성공하면
`EasyOpen-Android-0.1.1-beta.2-play.aab`와 `EasyOpen-Android-0.1.1-beta.2.apk`가 생성됩니다.

저장소가 자동으로 준비하는 범위:

- package `kr.io.mano.easyopen`
- 증가한 `versionCode`
- release keystore 기반 AAB/APK 서명
- AAB 압축 무결성과 서명 fingerprint 비교
- GitHub artifact와 prerelease용 SHA-256
- 스토어 문구와 데이터 보안 답변 근거

계정 소유자가 해야 하는 작업:

1. Play Console에서 앱을 만들고 기본 언어를 한국어로 선택
2. 앱 액세스·광고·콘텐츠 등급·대상 연령·데이터 보안 설문 작성
3. 개인정보처리방침으로 `https://easy-open.mano.io.kr/legal/` 등록
4. 내부 테스트 트랙에 AAB 업로드
5. 테스터 이메일 또는 Google Group 등록
6. Play App Signing을 사용하는 경우 upload key 인증서 등록 상태 확인
7. 실제 Android 기기에서 Play 링크 설치→다음 versionCode 업데이트를 검증

Google OAuth client와 계정 API 설정은 Mobile 로그인 UI 구현 완료를 뜻하지 않습니다. 현재 내부 테스트
설명에는 Jellyfin LAN 연결 등 실제 Mobile 구현만 적고 Google 로그인·결제 지원을 표시하지 않습니다.

스토어 스크린샷은 실제 빌드 화면에서 촬영해야 하며 모의 기능 이미지를 만들지 않습니다.
