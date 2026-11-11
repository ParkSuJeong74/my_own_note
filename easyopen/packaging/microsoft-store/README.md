# Microsoft Store Win32 제출 준비

EasyOpen Windows 기본 배포는 GitHub Releases의 서명된 NSIS 설치 파일입니다. Microsoft Store에는 동일한 서명 설치 파일을 Win32 앱으로 제출하며, Store 등록이 승인되기 전에는 웹 버튼을 활성화하지 않습니다.

저장소가 준비하는 항목:

- 고정 App ID `kr.io.mano.easyopen`
- x64 NSIS 설치 파일과 SHA-256
- Authenticode 서명 및 예상 게시자 검사
- 사용자 요청 기반 GitHub 자동 업데이트
- 앱 이름, 아이콘, 설명의 EasyOpen 브랜드 통일

Partner Center에서 계정 소유자가 입력해야 하는 항목:

1. 예약한 제품 이름과 Store product ID
2. 인증된 게시자 표시 이름
3. 공개된 HTTPS 설치 파일 URL과 버전별 SHA-256
4. silent install/uninstall 명령은 실제 NSIS 패키지에서 확인한 값
5. 연령 등급, 개인정보처리방침, 지원 연락처
6. 실제 Windows 11 설치·업데이트·제거 결과

Store 상세 URL이 실제 공개되면 웹 배포 환경의 `NEXT_PUBLIC_MICROSOFT_STORE_URL`에만 등록합니다.
