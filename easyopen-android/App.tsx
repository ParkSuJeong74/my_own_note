import React, {useEffect, useMemo, useState} from 'react';
import {
  Alert, Linking, Modal, Pressable, SafeAreaView, ScrollView, StatusBar,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import list from './src/catalog.generated.json';
import {fetchRemoteCatalog, validateCatalog} from './src/catalog';
import {
  androidApps, filterMobileApps, getOfficialLink, mobileCategories,
  toggleSaved, type MobileApp, type MobilePage,
} from './src/mobile-view-model';

const bundledCatalog = androidApps(validateCatalog(list));
const colors = {
  background: '#F6F7FA', paper: '#FFFFFF', ink: '#202A3D', muted: '#7A8394',
  border: '#E6E9F0', accent: '#5154C9', accentTint: '#EEEFFF',
  green: '#2E866C', greenBg: '#E9F5EF', pale: '#F1F3F7',
};

type IconName = 'file' | 'video' | 'map' | 'study' | 'tool';
function iconKind(app: MobileApp): IconName {
  if (app.category.includes('파일')) return 'file';
  if (app.category.includes('영상')) return 'video';
  if (app.category.includes('지도')) return 'map';
  if (app.category.includes('학습')) return 'study';
  return 'tool';
}
const glyphs: Record<IconName, string> = {file:'↔', video:'▶', map:'⌖', study:'▤', tool:'◇'};
const navItems: {id: MobilePage; name: string; glyph: string}[] = [
  {id:'home', name:'홈', glyph:'⌂'},
  {id:'discover', name:'탐색', glyph:'⌕'},
  {id:'saved', name:'보관함', glyph:'▣'},
  {id:'info', name:'안내', glyph:'ⓘ'},
];

function AppIcon({app, large = false}:{app:MobileApp;large?:boolean}) {
  const icon = iconKind(app);
  return <View style={[styles.appIcon, large && styles.appIconLarge, icon==='file' && styles.appIconGreen]}>
    <Text style={[styles.appGlyph, large && styles.appGlyphLarge, icon==='file' && styles.appGlyphGreen]}>{glyphs[icon]}</Text>
  </View>;
}

function Badge({children, soft = false}:{children:React.ReactNode;soft?:boolean}) {
  return <View style={[styles.badge,soft&&styles.badgeSoft]}><Text style={[styles.badgeText,soft&&styles.badgeTextSoft]}>{children}</Text></View>;
}

function AppRow({app, saved, onOpen}:{app:MobileApp;saved:boolean;onOpen:()=>void}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`${app.name} 상세 보기`} onPress={onOpen} style={({pressed})=>[styles.appRow, pressed && styles.pressed]}>
    <AppIcon app={app}/>
    <View style={styles.rowBody}>
      <Text style={styles.rowTitle} numberOfLines={1}>{app.name}</Text>
      <Text style={styles.rowSummary} numberOfLines={2}>{app.summary}</Text>
      <View style={styles.rowFoot}><Text style={styles.rowCategory}>{app.category}</Text>{saved && <Text style={styles.rowSaved}>·  보관함</Text>}</View>
    </View>
    <Text style={styles.chevron}>›</Text>
  </Pressable>;
}

export default function App() {
  const [apps,setApps] = useState<MobileApp[]>(bundledCatalog);
  const [page,setPage] = useState<MobilePage>('home');
  const [search,setSearch] = useState('');
  const [category,setCategory] = useState('전체');
  const [selected,setSelected] = useState<MobileApp | null>(null);
  const [saved,setSaved] = useState<string[]>([]);
  const [advanced,setAdvanced] = useState(false);
  const [searchFocus,setSearchFocus] = useState(false);

  useEffect(()=>{
    let active = true;
    void fetchRemoteCatalog()
      .then(remote=>{if(active)setApps(androidApps(remote));})
      .catch(()=>{});
    return ()=>{active=false;};
  },[]);

  const categories = useMemo(()=>mobileCategories(apps),[apps]);
  const visible = useMemo(()=>filterMobileApps(apps,search,category,saved,page==='saved'),[apps,search,category,saved,page]);
  const featured = useMemo(()=>apps.filter(app=>['localsend','vlc'].includes(app.id)),[apps]);
  const savedApps = useMemo(()=>apps.filter(app=>saved.includes(app.id)),[apps,saved]);

  function switchPage(next:MobilePage) {setPage(next);setCategory('전체');setSearch('');}
  function openDetail(app:MobileApp) {setAdvanced(false);setSelected(app);}
  function toggle(app:MobileApp) {setSaved(previous=>toggleSaved(previous,app.id));}
  async function goOfficial(app:MobileApp) {
    const url = getOfficialLink(app);
    if(!url) {Alert.alert('링크를 확인할 수 없어요','현재 등록된 공식 설치 링크를 다시 검토해야 해요.');return;}
    try {await Linking.openURL(url);}
    catch {Alert.alert('공식 페이지를 열 수 없어요','네트워크 연결이나 기기 설정을 확인해 주세요.');}
  }

  return <SafeAreaView style={styles.safe}>
    <StatusBar barStyle="dark-content"/>
    <View style={styles.topbar}>
      <View style={styles.brandMark}><Text style={styles.brandLetter}>e</Text></View>
      <View style={styles.brandStack}><Text style={styles.brandTitle}>EasyOpen</Text><Text style={styles.brandBy}>BY MANO</Text></View>
      <View style={styles.topbarSpace}/>
      <Badge soft>ANDROID BETA</Badge>
    </View>

    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
      {page==='home'&&<View style={styles.page}>
        <View style={styles.titleBlock}>
          <Text style={styles.eyebrow}>MY WORKSPACE</Text>
          <Text style={styles.pageTitle}>내 오픈소스 공간</Text>
          <Text style={styles.pageDescription}>필요한 앱을 찾고, 공식 출처에서 안전하게 시작하세요.</Text>
        </View>
        <View style={styles.summaryGrid}>
          <Pressable accessibilityRole="button" onPress={()=>switchPage('discover')} style={[styles.summaryCard,styles.summaryMain]}>
            <Text style={styles.summaryLabel}>탐색 가능한 앱</Text><Text style={styles.summaryCount}>{apps.length}<Text style={styles.summaryUnit}>개</Text></Text>
            <Text style={styles.summaryLink}>프로그램 살펴보기  →</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={()=>switchPage('saved')} style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>내 보관함</Text><Text style={styles.summaryCount}>{savedApps.length}<Text style={styles.summaryUnit}>개</Text></Text>
            <Text style={styles.summaryLink}>저장한 앱 보기  →</Text>
          </Pressable>
        </View>
        <View style={styles.sectionLine}><Text style={styles.sectionTitle}>시작하기 좋은 앱</Text><Pressable accessibilityRole="button" onPress={()=>switchPage('discover')}><Text style={styles.textAction}>전체 보기  ›</Text></Pressable></View>
        <View style={styles.listCard}>{featured.map(app=><AppRow key={app.id} app={app} saved={saved.includes(app.id)} onOpen={()=>openDetail(app)}/>)}</View>
        <View style={styles.guidanceCard}>
          <View style={styles.guidanceDot}><Text style={styles.guidanceGlyph}>✓</Text></View>
          <View style={styles.flex1}><Text style={styles.guidanceTitle}>공식 배포처에서 설치해요</Text><Text style={styles.guidanceBody}>현재 Android 베타는 직접 설치·업데이트를 수행하지 않아요. 스토어 이동과 사용 가이드를 제공해요.</Text></View>
        </View>
        <Text style={styles.footnote}>저장한 앱은 현재 실행 중에만 유지돼요. 계정과 기기 동기화는 아직 지원하지 않아요.</Text>
      </View>}

      {(page==='discover'||page==='saved')&&<View style={styles.page}>
        <View style={styles.titleBlock}>
          <Text style={styles.eyebrow}>{page==='discover'?'FIND YOUR TOOLS':'YOUR COLLECTION'}</Text>
          <Text style={styles.pageTitle}>{page==='discover'?'프로그램 탐색':'내 보관함'}</Text>
          <Text style={styles.pageDescription}>{page==='discover'?'하고 싶은 작업에 맞는 오픈소스를 찾아보세요.':'관심 있는 프로그램을 빠르게 다시 찾아보세요.'}</Text>
        </View>
        <View style={[styles.searchBar,searchFocus&&styles.searchBarFocused]}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput value={search} onChangeText={setSearch} onFocus={()=>setSearchFocus(true)} onBlur={()=>setSearchFocus(false)} placeholder="앱 이름이나 기능 검색" placeholderTextColor="#9AA2B1" style={styles.searchInput} returnKeyType="search" accessibilityLabel="프로그램 검색"/>
          {search.length>0&&<Pressable accessibilityRole="button" accessibilityLabel="검색어 지우기" onPress={()=>setSearch('')}><Text style={styles.clear}>×</Text></Pressable>}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipsScroll}>
          {categories.map(item=><Pressable key={item} accessibilityRole="button" accessibilityState={{selected:category===item}} onPress={()=>setCategory(item)} style={[styles.chip,category===item&&styles.chipActive]}><Text style={[styles.chipText,category===item&&styles.chipTextActive]}>{item}</Text></Pressable>)}
        </ScrollView>
        <View style={styles.sectionLine}><Text style={styles.sectionTitle}>{page==='discover'?'전체 프로그램':'저장한 프로그램'}</Text><Text style={styles.resultCount}>{visible.length}개</Text></View>
        <View style={styles.listCard}>{visible.map(app=><AppRow key={app.id} app={app} saved={saved.includes(app.id)} onOpen={()=>openDetail(app)}/>)}
          {visible.length===0&&<View style={styles.empty}><Text style={styles.emptySymbol}>⌕</Text><Text style={styles.emptyTitle}>{page==='saved'&&!saved.length?'아직 저장한 앱이 없어요':'검색 결과가 없어요'}</Text><Text style={styles.emptyDescription}>{page==='saved'?'프로그램 상세 화면에서 보관함에 추가해 보세요.':'검색어나 카테고리를 변경해 보세요.'}</Text>{page==='saved'&&<Pressable onPress={()=>switchPage('discover')} style={styles.emptyButton}><Text style={styles.emptyButtonText}>프로그램 탐색하기</Text></Pressable>}</View>}
        </View>
        <Text style={styles.footnote}>EasyOpen이 직접 설치를 관리하는 기능은 추후 검증 후 제공할 예정입니다.</Text>
      </View>}

      {page==='info'&&<View style={styles.page}>
        <View style={styles.titleBlock}><Text style={styles.eyebrow}>ABOUT THIS BETA</Text><Text style={styles.pageTitle}>이용 안내</Text><Text style={styles.pageDescription}>EasyOpen은 비개발자도 유용한 오픈소스를 쉽게 시작할 수 있도록 돕는 앱이에요.</Text></View>
        <View style={styles.infoCard}><Text style={styles.infoHeading}>지금 사용할 수 있는 기능</Text><Text style={styles.infoParagraph}>Android 오픈소스 검색, 상세 사양 및 한국어 가이드, 보관함, 공식 스토어 이동을 제공합니다.</Text></View>
        <View style={styles.infoCard}><Text style={styles.infoHeading}>아직 개발 중인 기능</Text><Text style={styles.infoParagraph}>기기에 설치된 앱 감지, 직접 APK 설치, 업데이트·제거, 결제 및 구독 관리는 아직 지원하지 않아요.</Text></View>
        <View style={styles.infoCard}><Text style={styles.infoHeading}>데이터와 개인정보</Text><Text style={styles.infoParagraph}>이 베타 화면은 로그인을 요구하지 않으며 구매·개인정보를 수집하지 않습니다. 보관함은 앱 실행 중에만 유지됩니다.</Text></View>
      </View>}
    </ScrollView>

    <View style={styles.bottomNav} accessibilityRole="tablist">
      {navItems.map(item=><Pressable key={item.id} accessibilityRole="tab" accessibilityState={{selected:page===item.id}} accessibilityLabel={item.name} onPress={()=>switchPage(item.id)} style={styles.navItem}>
        <Text style={[styles.navGlyph,page===item.id&&styles.navSelected]}>{item.glyph}</Text><Text style={[styles.navLabel,page===item.id&&styles.navSelected]}>{item.name}</Text>
        {page===item.id&&<View style={styles.navIndicator}/>}
      </Pressable>)}
    </View>

    <Modal animationType="slide" presentationStyle="pageSheet" visible={Boolean(selected)} onRequestClose={()=>setSelected(null)}>
      <SafeAreaView style={styles.modalSafe}>
        <View style={styles.modalHeader}><Text style={styles.modalCaption}>프로그램 정보</Text><Pressable accessibilityRole="button" onPress={()=>setSelected(null)} style={styles.closeButton}><Text style={styles.closeLabel}>닫기  ×</Text></Pressable></View>
        {selected&&<ScrollView contentContainerStyle={styles.detailContent}>
          <View style={styles.detailHeading}><AppIcon app={selected} large/><View style={styles.detailHeadingText}><Text style={styles.detailCategory}>{selected.category} · 공식 오픈소스</Text><Text style={styles.detailTitle}>{selected.name}</Text></View></View>
          <Text style={styles.detailSummary}>{selected.summary}</Text>
          <View style={styles.detailNotice}><Text style={styles.detailNoticeTitle}>설치 방식 안내</Text><Text style={styles.detailNoticeBody}>EasyOpen은 현재 Android 앱의 설치 상태를 확인하거나 직접 설치하지 않아요. 공식 스토어에서 설치를 진행해 주세요.</Text></View>
          <Pressable style={styles.primaryButton} accessibilityRole="button" onPress={()=>void goOfficial(selected)}><Text style={styles.primaryLabel}>공식 설치 페이지 열기  ↗</Text></Pressable>
          <Pressable style={styles.secondaryButton} accessibilityRole="button" onPress={()=>toggle(selected)}><Text style={styles.secondaryLabel}>{saved.includes(selected.id)?'✓  보관함에 저장됨 · 제거하기':'＋  내 보관함에 저장하기'}</Text></Pressable>
          <View style={styles.detailSection}><Text style={styles.detailSectionTitle}>설치 전 확인</Text><Text style={styles.detailText}>{selected.requirements}</Text></View>
          <View style={styles.detailSection}><Text style={styles.detailSectionTitle}>첫 사용 가이드</Text><Text style={styles.detailText}>{selected.guide}</Text></View>
          <Pressable style={styles.advancedHeader} accessibilityRole="button" accessibilityState={{expanded:advanced}} onPress={()=>setAdvanced(!advanced)}><Text style={styles.advancedTitle}>기술 정보 및 라이선스</Text><Text style={styles.advancedArrow}>{advanced?'⌄':'›'}</Text></Pressable>
          {advanced&&<View style={styles.advancedBody}><Text style={styles.technical}>라이선스  {selected.license}</Text><Text style={styles.technical}>Android 패키지  {selected.install.android?.packageName??'정보 없음'}</Text><Text style={styles.technical}>EasyOpen 설치 검증  미완료</Text></View>}
          <Text style={styles.detailBottom}>설치 링크가 잘못되었거나 열리지 않는 경우 EasyOpen 웹사이트에서 공식 출처를 확인해 주세요.</Text>
        </ScrollView>}
      </SafeAreaView>
    </Modal>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:colors.background},
  flex1:{flex:1}, pressed:{backgroundColor:'#FAFBFD'},
  topbar:{height:68,paddingHorizontal:20,flexDirection:'row',alignItems:'center',backgroundColor:colors.paper,borderBottomWidth:1,borderBottomColor:colors.border},
  brandMark:{width:36,height:36,borderRadius:11,backgroundColor:colors.accent,alignItems:'center',justifyContent:'center',marginRight:10},
  brandLetter:{fontSize:25,fontWeight:'900',color:colors.paper,marginTop:-3},
  brandStack:{gap:1},brandTitle:{fontSize:17,fontWeight:'800',color:colors.ink,letterSpacing:-0.4},brandBy:{fontSize:9,fontWeight:'700',letterSpacing:1.5,color:colors.muted},topbarSpace:{flex:1},
  badge:{paddingHorizontal:10,paddingVertical:6,borderRadius:8,backgroundColor:colors.greenBg},badgeText:{fontSize:10,fontWeight:'800',color:colors.green},
  badgeSoft:{backgroundColor:colors.accentTint},badgeTextSoft:{color:colors.accent},
  scrollContent:{flexGrow:1,paddingBottom:40},page:{paddingHorizontal:18,paddingTop:28},titleBlock:{marginBottom:23},
  eyebrow:{fontSize:10,color:colors.accent,letterSpacing:1.7,fontWeight:'800'},pageTitle:{fontSize:25,letterSpacing:-0.7,lineHeight:34,fontWeight:'800',color:colors.ink,marginTop:7},
  pageDescription:{fontSize:13,lineHeight:20,color:colors.muted,marginTop:8},
  summaryGrid:{flexDirection:'row',gap:10,marginBottom:29},summaryCard:{flex:1,backgroundColor:colors.paper,borderColor:colors.border,borderWidth:1,borderRadius:16,padding:16,minHeight:139,justifyContent:'space-between'},summaryMain:{borderColor:'#DADDF5'},summaryLabel:{fontSize:12,color:colors.muted,fontWeight:'600'},summaryCount:{fontSize:33,color:colors.ink,fontWeight:'800'},summaryUnit:{fontSize:13,color:colors.muted,fontWeight:'600'},summaryLink:{fontSize:11,color:colors.accent,fontWeight:'800'},
  sectionLine:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:13},sectionTitle:{fontSize:16,fontWeight:'800',color:colors.ink},textAction:{fontSize:12,fontWeight:'700',color:colors.accent},resultCount:{fontSize:12,color:colors.muted},
  listCard:{borderRadius:16,backgroundColor:colors.paper,borderWidth:1,borderColor:colors.border,overflow:'hidden'},
  appRow:{paddingHorizontal:14,paddingVertical:15,flexDirection:'row',alignItems:'center',borderBottomWidth:1,borderBottomColor:'#F0F1F5',minHeight:88},
  appIcon:{width:48,height:48,borderRadius:14,backgroundColor:colors.accentTint,alignItems:'center',justifyContent:'center',marginRight:12},appIconGreen:{backgroundColor:colors.greenBg},appGlyph:{fontSize:23,fontWeight:'800',color:colors.accent},appGlyphGreen:{color:colors.green},appIconLarge:{width:62,height:62,borderRadius:18},appGlyphLarge:{fontSize:29},
  rowBody:{flex:1},rowTitle:{fontSize:14,fontWeight:'800',color:colors.ink},rowSummary:{fontSize:12,lineHeight:18,color:colors.muted,marginTop:3},rowFoot:{flexDirection:'row',alignItems:'center',marginTop:6},rowCategory:{color:colors.accent,fontSize:10,fontWeight:'700'},rowSaved:{fontSize:10,color:colors.green,fontWeight:'700'},chevron:{fontSize:25,color:'#AFB7C5',paddingLeft:11},
  guidanceCard:{backgroundColor:'#EDF3F5',borderRadius:14,padding:16,flexDirection:'row',alignItems:'flex-start',gap:12,marginTop:19},guidanceDot:{width:24,height:24,borderRadius:12,backgroundColor:colors.green,alignItems:'center',justifyContent:'center'},guidanceGlyph:{color:'white',fontWeight:'800',fontSize:12},guidanceTitle:{fontSize:13,color:colors.ink,fontWeight:'800'},guidanceBody:{fontSize:11,lineHeight:18,color:'#667A80',marginTop:5},
  footnote:{fontSize:11,lineHeight:18,color:colors.muted,marginTop:18,marginBottom:18},
  searchBar:{height:49,backgroundColor:colors.paper,borderRadius:12,borderWidth:1,borderColor:colors.border,flexDirection:'row',alignItems:'center',paddingHorizontal:13},searchBarFocused:{borderColor:colors.accent},searchIcon:{fontSize:24,color:colors.muted,marginRight:9},searchInput:{flex:1,fontSize:14,color:colors.ink,paddingVertical:8},clear:{fontSize:24,color:colors.muted,paddingHorizontal:7},
  chipsScroll:{marginTop:14,marginBottom:23},chips:{gap:8,alignItems:'center'},chip:{borderWidth:1,borderColor:colors.border,backgroundColor:colors.paper,borderRadius:20,paddingHorizontal:14,paddingVertical:9},chipActive:{backgroundColor:colors.ink,borderColor:colors.ink},chipText:{fontSize:11,color:colors.muted,fontWeight:'700'},chipTextActive:{color:'white'},
  empty:{alignItems:'center',paddingHorizontal:20,paddingVertical:40},emptySymbol:{fontSize:30,color:'#C3C8D2'},emptyTitle:{fontSize:14,fontWeight:'800',color:colors.ink,marginTop:5},emptyDescription:{fontSize:12,textAlign:'center',lineHeight:20,color:colors.muted,marginTop:7},emptyButton:{padding:12,marginTop:15},emptyButtonText:{color:colors.accent,fontWeight:'800',fontSize:12},
  bottomNav:{height:71,backgroundColor:colors.paper,borderTopWidth:1,borderTopColor:colors.border,flexDirection:'row',paddingHorizontal:9},navItem:{flex:1,alignItems:'center',justifyContent:'center',gap:3},navGlyph:{fontSize:23,color:'#A5ACBA',fontWeight:'500'},navLabel:{fontSize:10,fontWeight:'700',color:colors.muted},navSelected:{color:colors.accent},navIndicator:{position:'absolute',top:0,width:28,height:3,backgroundColor:colors.accent,borderBottomLeftRadius:4,borderBottomRightRadius:4},
  infoCard:{backgroundColor:colors.paper,borderRadius:14,padding:18,borderWidth:1,borderColor:colors.border,marginBottom:12},infoHeading:{fontSize:14,fontWeight:'800',color:colors.ink},infoParagraph:{fontSize:12,lineHeight:21,color:colors.muted,marginTop:9},
  modalSafe:{flex:1,backgroundColor:colors.paper},modalHeader:{height:57,paddingHorizontal:19,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderBottomColor:colors.border},modalCaption:{fontWeight:'800',color:colors.ink,fontSize:14},closeButton:{padding:9},closeLabel:{color:colors.accent,fontWeight:'700',fontSize:13},detailContent:{padding:21,paddingBottom:70},
  detailHeading:{flexDirection:'row',alignItems:'center',gap:4},detailHeadingText:{flex:1},detailCategory:{fontSize:11,color:colors.accent,fontWeight:'700'},detailTitle:{fontSize:25,fontWeight:'800',color:colors.ink,letterSpacing:-0.6,marginTop:5},detailSummary:{fontSize:13,lineHeight:20,color:colors.muted,marginTop:14},
  detailNotice:{padding:16,borderRadius:13,backgroundColor:'#EFF1FB',marginTop:24,marginBottom:18},detailNoticeTitle:{fontSize:12,fontWeight:'800',color:colors.accent},detailNoticeBody:{fontSize:12,lineHeight:20,color:'#66719A',marginTop:6},
  primaryButton:{height:50,backgroundColor:colors.accent,borderRadius:11,justifyContent:'center',alignItems:'center'},primaryLabel:{color:'white',fontSize:13,fontWeight:'800'},secondaryButton:{height:47,marginTop:9,borderRadius:11,borderWidth:1,borderColor:colors.border,alignItems:'center',justifyContent:'center'},secondaryLabel:{fontSize:13,color:colors.accent,fontWeight:'700'},
  detailSection:{marginTop:27,paddingBottom:19,borderBottomWidth:1,borderBottomColor:colors.border},detailSectionTitle:{fontSize:15,fontWeight:'800',color:colors.ink,marginBottom:10},detailText:{fontSize:13,lineHeight:23,color:'#657080'},advancedHeader:{paddingVertical:17,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},advancedTitle:{fontSize:13,fontWeight:'700',color:colors.ink},advancedArrow:{fontSize:24,color:colors.muted},advancedBody:{backgroundColor:colors.background,borderRadius:12,padding:16,gap:12},technical:{fontSize:12,lineHeight:19,color:colors.muted},detailBottom:{fontSize:11,lineHeight:18,color:colors.muted,marginTop:23},
});
