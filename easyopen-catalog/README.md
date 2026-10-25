# EasyOpen 정적 카탈로그

`apps.json`은 웹·데스크톱·Android가 함께 쓰는 **소규모 선별 프로그램 메타데이터**입니다. 오픈소스 소스코드, 설치 바이너리, 모델 가중치를 보관하지 않습니다.

- `install.windows.method=winget`은 **개발자 테스트용 동작 후보**일 뿐 검증 완료의 의미가 아닙니다. 실제 Windows 환경에서 버전·공식 출처·설치·업데이트·제거를 검증하기 전에는 사용자 화면에 '검증됨'으로 표시하지 않습니다.
- CosyVoice, Whisper, Ollama는 모델별 라이선스 검토와 설치 어댑터 작업이 필요합니다. 현재 공식 링크만 제공됩니다.
- Android는 공식 스토어 링크를 우선합니다. 별도 APK 다운로더·무인 설치를 포함하지 않습니다.
- `license` 표시는 **초안**이며 상품화/재배포 전에 코드를 포함한 의존성, 모델, 상표 권리를 따로 확인해야 합니다.
- 추가할 패키지의 ID·버전·서명·해시·OS 검증일은 별도 승인된 매니페스트로 관리해야 합니다.

`node --test easyopen-desktop/tests/*.test.mjs easyopen-android/tests/*.test.mjs`로 정적 데이터 검사를 실행할 수 있습니다.
