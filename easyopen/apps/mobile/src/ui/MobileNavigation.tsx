import React from 'react';
import {Pressable,Text,View} from 'react-native';
import type {MobilePage} from '../mobile-view-model';
import {styles} from '../ui/styles';

const navItems: {id: MobilePage; name: string; glyph: string}[] = [
  {id:'home', name:'홈', glyph:'⌂'},
  {id:'discover', name:'찾기', glyph:'◇'},
  {id:'servers', name:'내 PC', glyph:'▣'},
  {id:'info', name:'설정', glyph:'⚙'},
];

export function MobileNavigation({page,onNavigate}:{page:MobilePage;onNavigate:(page:MobilePage)=>void}){
  const selected=(id:MobilePage)=>page===id||(id==='home'&&page==='saved');
  return <View style={styles.bottomNav} accessibilityRole="tablist">
      {navItems.map(item=><Pressable key={item.id} accessibilityRole="tab" accessibilityState={{selected:selected(item.id)}} accessibilityLabel={item.name} onPress={()=>onNavigate(item.id)} style={styles.navItem}>
        <Text style={[styles.navGlyph,selected(item.id)&&styles.navSelected]}>{item.glyph}</Text><Text style={[styles.navLabel,selected(item.id)&&styles.navSelected]}>{item.name}</Text>
        {selected(item.id)&&<View style={styles.navIndicator}/>}
      </Pressable>)}
    </View>;
}
