# EasyOpen Google Play 내부 테스트 준비

CI의 `Build/Release Desktop/Android apps` workflow를 `release_scope=android`, `publish=true`로 실행하면 동일 릴리스 키로 서명된 APK와 `*-play.aab`를 생성합니다. AAB는 Play Console 내부 테스트 트랙에 업로드하고 APK는 GitHub 설치 대체 경로로 사용합니다.

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

스토어 스크린샷은 실제 빌드 화면에서 촬영해야 하며 모의 기능 이미지를 만들지 않습니다.
