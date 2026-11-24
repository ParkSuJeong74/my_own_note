import React from 'react';
import {Pressable,Text,View} from 'react-native';
import type {MobileApp,MobilePage} from '../mobile-view-model';
import {AppRow} from '../ui/ProgramRow';
import {styles} from '../ui/styles';
type HomeScreenProps={serverCount:number;managedApps:MobileApp[];featured:MobileApp[];onNavigate:(page:MobilePage)=>void;onOpen:(app:MobileApp)=>void;onUse:()=>void};
export function HomeScreen({serverCount,managedApps,featured,onNavigate,onOpen,onUse}:HomeScreenProps){
 const recent=managedApps[0];
 return <View style={styles.page}>
  <View style={styles.titleBlock}><Text style={styles.eyebrow}>MY WORKSPACE</Text><Text accessibilityRole="header" style={styles.pageTitle}>내 프로그램을,{"\n"}어디서나 편하게.</Text><Text style={styles.pageDescription}>PC에서 준비하고, 휴대폰에서 이어서 이용하세요.</Text></View>
  <Pressable accessibilityRole="button" accessibilityLabel={recent?recent.name+' 이어서 사용하기':'첫 PC 연결하기'} onPress={()=>recent?onUse():onNavigate('servers')} style={styles.workspaceHero}>
   <View style={styles.heroTop}><Text style={styles.heroEyebrow}>{recent?'이어서 사용하기':'처음 시작하기'}</Text><View style={styles.heroSymbol}><Text style={styles.heroSymbolText}>{recent?'▷':'▣'}</Text></View></View>
   <Text style={styles.heroTitle}>{recent?recent.name:'내 PC와 연결해 보세요'}</Text><Text style={styles.heroBody}>{recent?'등록한 PC의 프로그램을 열어보세요. 연결 상태는 열 때 다시 확인해요.':'PC에 있는 프로그램과 파일은 그대로, 같은 Wi-Fi에서 이용할 수 있어요.'}</Text>
   <View style={styles.heroCta}><Text style={styles.heroCtaText}>{recent?'프로그램 열기':'PC 연결하기'}</Text><Text style={styles.heroCtaText}>→</Text></View>
  </Pressable>
  <View style={styles.workspaceLinks}><Pressable accessibilityRole="button" onPress={()=>onNavigate('servers')} style={styles.workspaceLink}><Text style={styles.workspaceLinkIcon}>▣</Text><View style={styles.flex1}><Text style={styles.infoHeading}>내 PC</Text><Text style={styles.infoParagraph}>등록한 기기 {serverCount}대</Text></View><Text style={styles.chevron}>›</Text></Pressable><Pressable accessibilityRole="button" onPress={()=>onNavigate('saved')} style={styles.workspaceLink}><Text style={styles.workspaceLinkIcon}>◇</Text><View style={styles.flex1}><Text style={styles.infoHeading}>내 프로그램</Text><Text style={styles.infoParagraph}>{managedApps.length}개 연결 정보</Text></View><Text style={styles.chevron}>›</Text></Pressable></View>
  <View style={styles.sectionLine}><Text accessibilityRole="header" style={styles.sectionTitle}>살펴볼 프로그램</Text><Pressable accessibilityRole="button" onPress={()=>onNavigate('discover')} style={styles.sectionAction}><Text style={styles.textAction}>전체 보기 →</Text></Pressable></View>
  <View style={styles.listCard}>{featured.map(app=><AppRow key={app.id} app={app} connected={managedApps.some(item=>item.id===app.id)} onOpen={()=>onOpen(app)}/>)}</View>
  <View style={styles.guidanceCard}><View style={styles.guidanceDot}><Text style={styles.guidanceGlyph}>✓</Text></View><View style={styles.flex1}><Text style={styles.guidanceTitle}>내 파일은 내 PC에 그대로</Text><Text style={styles.guidanceBody}>모바일은 연결과 이용을, 설치와 실행 환경 관리는 PC 앱에서 담당해요.</Text></View></View>
  <Text style={styles.footnote}>현재 Jellyfin 연결을 베타로 제공하며, 다른 프로그램은 준비가 끝난 뒤 추가됩니다.</Text>
 </View>;
}
