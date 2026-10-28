export type JellyfinMobileGuideStep={title:string;body:string};

export const jellyfinMobileGuide:JellyfinMobileGuideStep[]=[
  {title:'PC에서 Jellyfin 시작',body:'Windows 또는 Mac의 EasyOpen에서 Jellyfin을 먼저 실행하세요. 휴대폰과 PC는 같은 Wi-Fi에 연결되어 있어야 합니다.'},
  {title:'PC 주소 등록',body:'Desktop에 표시된 192.168.x.x:8096 주소와 알아보기 쉬운 기기 이름을 서버 화면에 입력하세요.'},
  {title:'Jellyfin 로그인',body:'등록한 서버의 `사용하기`를 누르고 PC에서 만든 Jellyfin 관리자 또는 사용자 계정으로 로그인하세요. EasyOpen은 비밀번호를 따로 수집하지 않습니다.'},
  {title:'영상 골라서 재생',body:'라이브러리에서 영상을 선택하면 EasyOpen 안에서 재생됩니다. 연결되지 않으면 PC 실행 상태, 같은 Wi-Fi, 주소 순서로 확인하세요.'},
];
