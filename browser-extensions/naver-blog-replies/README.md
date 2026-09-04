# Mano Naver Blog Replies

1. Doppler `mano/prd`에 임의의 긴 `MANO_BLOG_INGEST_TOKEN`을 추가하고 Mano를 배포합니다.
2. Chrome `chrome://extensions`에서 개발자 모드를 켜고 **압축해제된 확장 프로그램을 로드**합니다.
3. 이 디렉터리를 선택한 뒤 확장 팝업에 Mano 주소와 같은 토큰을 저장합니다.
4. 내 네이버 블로그 글에서 댓글을 펼치고 **보이는 댓글 수집**을 누릅니다.

네이버 DOM 변경으로 댓글을 찾지 못하면 `popup.js`의 selector만 갱신합니다. 확장은 네이버
쿠키나 전체 HTML을 전송하지 않습니다. 수집 결과는 Mano에서 확인하고 이미 답한 댓글은
직접 완료 처리합니다.
