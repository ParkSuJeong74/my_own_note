export type JellyfinMobileGuideStep={title:string;body:string};

export const jellyfinMobileGuide:JellyfinMobileGuideStep[]=[
  {title:'PC에서 Jellyfin 시작',body:'Windows 또는 Mac의 EasyOpen에서 Jellyfin을 먼저 실행하세요. 휴대폰과 PC는 같은 Wi-Fi에 연결되어 있어야 합니다.'},
  {title:'내 PC 연결',body:'EasyOpen Desktop에 표시된 192.168.x.x:8096 형식의 주소와 알아보기 쉬운 PC 이름을 입력하세요.'},
  {title:'Jellyfin 로그인',body:'연결한 PC에서 `Jellyfin 열기`를 누르고 PC에서 만든 Jellyfin 계정으로 로그인하세요. EasyOpen은 비밀번호를 따로 수집하지 않습니다.'},
  {title:'영상 골라서 재생',body:'라이브러리에서 영상을 선택하면 EasyOpen 안에서 재생됩니다. 연결되지 않으면 PC 실행 상태, 같은 Wi-Fi, 주소 순서로 확인하세요.'},
];
