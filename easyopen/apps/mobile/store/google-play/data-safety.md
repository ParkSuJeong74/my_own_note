# Google Play 데이터 보안 답변 근거

이 문서는 Play Console 입력용 근거이며 Console 제출 자체를 대신하지 않습니다.

## 현재 코드에서 확인된 처리

- EasyOpen 운영 서버로 계정, Jellyfin 로그인 정보, 미디어 목록을 전송하는 코드는 없습니다.
- 사용자가 입력한 Jellyfin 서버 이름·사설 LAN 주소·기본 서버 선택은 Android 앱의 AsyncStorage에 저장됩니다.
- 서버 상태 확인과 WebView 통신은 사용자가 등록한 Jellyfin 서버로 직접 전송됩니다.
- Jellyfin 계정과 비밀번호는 Jellyfin Web UI가 해당 Jellyfin 서버와 직접 처리하며 EasyOpen 운영자가 수집하지 않습니다.
- 광고 SDK, 모바일 분석 SDK, 위치·연락처·사진 권한은 현재 포함하지 않습니다.
- Android manifest의 별도 위험 권한 목록은 비어 있습니다.

## Console에서 사용자 확인이 필요한 항목

- Google Play가 사용자 제공 서버 주소를 `앱 기능` 목적의 수집으로 분류하는지 최신 설문 문구에 따라 확인
- WebView에서 Jellyfin 서버로 보내는 로그인 정보를 제3자 처리로 어떻게 신고할지 Play Console 안내에 따라 확인
- 비공개 내부 테스트라도 개인정보처리방침 URL 등록

## 삭제 방법

앱의 서버 목록에서 저장한 연결을 삭제하거나 Android 시스템 설정에서 EasyOpen 저장공간을 삭제하면 로컬 연결 정보가 제거됩니다. Jellyfin 서버에 저장된 계정·시청 기록·미디어는 해당 Jellyfin 서버에서 별도로 관리해야 합니다.
