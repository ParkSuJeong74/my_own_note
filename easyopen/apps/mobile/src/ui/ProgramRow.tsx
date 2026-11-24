import React from 'react';
import {Pressable,Text,View} from 'react-native';
import type {MobileApp} from '../mobile-view-model';
import {styles} from './styles';

type IconName = 'file' | 'video' | 'map' | 'study' | 'tool';
function iconKind(app: MobileApp): IconName {
  if (app.category.includes('파일')) return 'file';
  if (app.category.includes('영상')) return 'video';
  if (app.category.includes('지도')) return 'map';
  if (app.category.includes('학습')) return 'study';
  return 'tool';
}
const glyphs: Record<IconName, string> = {file:'↔', video:'▶', map:'⌖', study:'▤', tool:'◇'};
export function AppIcon({app, large = false}:{app:MobileApp;large?:boolean}) {
  const icon = iconKind(app);
  return <View style={[styles.appIcon, large && styles.appIconLarge, icon==='file' && styles.appIconGreen]}>
    <Text style={[styles.appGlyph, large && styles.appGlyphLarge, icon==='file' && styles.appGlyphGreen]}>{glyphs[icon]}</Text>
  </View>;
}

export function Badge({children, soft = false}:{children:React.ReactNode;soft?:boolean}) {
  return <View style={[styles.badge,soft&&styles.badgeSoft]}><Text style={[styles.badgeText,soft&&styles.badgeTextSoft]}>{children}</Text></View>;
}

export function AppRow({app, connected = false, onOpen}:{app:MobileApp;connected?:boolean;onOpen:()=>void}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`${app.name} 상세 보기`} onPress={onOpen} style={({pressed})=>[styles.appRow,pressed&&styles.pressed]}>
    <View style={styles.programCardHeading}><AppIcon app={app}/><View style={styles.rowBody}><Text style={styles.rowTitle}>{app.name}</Text><Text style={styles.rowCategory}>{app.category}</Text></View><Badge soft>{connected?'PC 등록됨':'오픈소스'}</Badge></View>
    <Text style={styles.rowSummary}>{app.summary}</Text>
    <View style={styles.programCardFooter}><Text style={styles.rowSaved}>{connected?'내 PC에 연결해서 이용':'사용 방법과 지원 환경 확인'}</Text><Text style={styles.programCardAction}>살펴보기  →</Text></View>
  </Pressable>;
}
