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
  return <Pressable accessibilityRole="button" accessibilityLabel={`${app.name} 상세 보기`} onPress={onOpen} style={({pressed})=>[styles.appRow, pressed && styles.pressed]}>
    <AppIcon app={app}/>
    <View style={styles.rowBody}>
      <Text style={styles.rowTitle} numberOfLines={1}>{app.name}</Text>
      <Text style={styles.rowSummary} numberOfLines={2}>{app.summary}</Text>
      <View style={styles.rowFoot}><Text style={styles.rowCategory}>{app.category}</Text>{connected && <Text style={styles.rowSaved}>·  연결됨</Text>}</View>
    </View>
    <Text style={styles.chevron}>›</Text>
  </Pressable>;
}

