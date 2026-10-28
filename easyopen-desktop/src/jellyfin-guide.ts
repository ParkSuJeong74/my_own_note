export type JellyfinGuideStep={title:string;body:string};

const shared:JellyfinGuideStep[]=[
  {title:'첫 관리자 설정',body:'Jellyfin 화면의 안내에 따라 언어와 관리자 계정을 정하세요. 계정과 비밀번호는 Jellyfin에만 저장되며 EasyOpen은 수집하지 않습니다.'},
  {title:'미디어 폴더 연결',body:'EasyOpen에서 영상 폴더를 선택한 뒤 Jellyfin의 라이브러리에 추가하세요. EasyOpen은 원본 파일을 이동하거나 삭제하지 않습니다.'},
  {title:'휴대폰에서 이어 보기',body:'PC와 휴대폰을 같은 Wi-Fi에 연결하고 표시된 LAN 주소를 Android EasyOpen에 등록하세요. 주소와 QR에는 계정이나 비밀번호가 들어 있지 않습니다.'},
];

export function desktopJellyfinGuide(platform:string):JellyfinGuideStep[]{
  const first=platform==='darwin'
    ?{title:'GitHub 자산 검증 대기',body:'EasyOpen은 공개 jellyfin GitHub Release만 확인합니다. 현재 Mac DMG는 서명 검증 실패로 차단하며 서명 우회나 임시 설치를 안내하지 않습니다.'}
    :{title:'Jellyfin 사용 준비',body:'`사용하기`를 누르면 EasyOpen이 검토한 공식 파일을 확인하고 전용 공간에 준비합니다. 완료되면 `다시 사용하기`로 서버를 시작하세요.'};
  return [first,...shared];
}
