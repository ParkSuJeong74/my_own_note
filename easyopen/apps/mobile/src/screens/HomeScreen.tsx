import React from 'react';
import {Pressable,Text,View} from 'react-native';
import type {MobileApp,MobilePage} from '../mobile-view-model';
import {AppRow} from '../ui/ProgramRow';
import {styles} from '../ui/styles';

type HomeScreenProps={
  serverCount:number;
  managedApps:MobileApp[];
  featured:MobileApp[];
  onNavigate:(page:MobilePage)=>void;
  onOpen:(app:MobileApp)=>void;
};
export function HomeScreen({serverCount,managedApps,featured,onNavigate,onOpen}:HomeScreenProps){
  return <View style={styles.page}>
        <View style={styles.titleBlock}>
          <Text style={styles.eyebrow}>내 작업 공간</Text>
          <Text style={styles.pageTitle}>바로 이어서 사용해요</Text>
          <Text style={styles.pageDescription}>연결된 PC의 프로그램을 휴대폰에서 편하게 이용하세요.</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={()=>onNavigate('servers')} style={styles.infoCard}><Text style={styles.infoHeading}>내 PC 연결  ›</Text><Text style={styles.infoParagraph}>등록한 PC {serverCount}대 · 연결 상태 확인</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={()=>onNavigate('saved')} style={[styles.infoCard,styles.summaryMain]}>
          <Text style={styles.infoHeading}>내 프로그램</Text>
          <Text style={styles.infoParagraph}>{managedApps.length? '연결한 프로그램을 열고 이용하세요.':'PC를 연결하면 사용할 프로그램이 여기에 표시됩니다.'}</Text>
          <Text style={styles.summaryLink}>이어서 사용하기  →</Text>
        </Pressable>
        <View style={styles.sectionLine}><Text style={styles.sectionTitle}>지원 프로그램</Text><Text style={styles.resultCount}>테스트 중</Text></View>
        <View style={styles.listCard}>{featured.map(app=><AppRow key={app.id} app={app} connected={managedApps.some(item=>item.id===app.id)} onOpen={()=>onOpen(app)}/>)}</View>
        <View style={styles.guidanceCard}>
          <View style={styles.guidanceDot}><Text style={styles.guidanceGlyph}>✓</Text></View>
          <View style={styles.flex1}><Text style={styles.guidanceTitle}>영상은 내 PC에 그대로 있어요</Text><Text style={styles.guidanceBody}>EasyOpen 모바일은 같은 Wi-Fi에 있는 내 PC의 Jellyfin 화면을 연결해 보여 줍니다.</Text></View>
        </View>
        <Text style={styles.footnote}>현재는 Jellyfin을 첫 번째 프로그램으로 테스트하고 있어요. 다른 프로그램은 준비가 끝난 뒤 추가됩니다.</Text>
      </View>;
}
