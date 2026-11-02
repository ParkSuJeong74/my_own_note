import React, {useEffect, useMemo, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Alert, Linking, Modal, Pressable, SafeAreaView, ScrollView, StatusBar,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import {WebView} from 'react-native-webview';
import {easyOpenTheme} from '@easyopen/design-tokens';
import {jellyfinMobileGuide} from './src/jellyfin-guide';
import list from './src/catalog.generated.json';
import {fetchRemoteCatalog, validateCatalog} from './src/catalog';
import {
  filterMobileApps, getOfficialLink, managedMobileApps, mobileCategories, publicMobileApps, usesEasyOpenClient,
  type MobileApp, type MobilePage,
} from './src/mobile-view-model';
import {
  addServer, emptyServerRegistry, isAllowedJellyfinNavigation, jellyfinWebUrl, normalizeLanServerUrl, parseServerRegistry, removeServer,
  setDefaultServer, updateServerStatus, type SavedServer, type ServerRegistry,
} from './src/server-registry';

const bundledCatalog = publicMobileApps(validateCatalog(list));
const colors = {
  background: easyOpenTheme.color.canvas, paper: easyOpenTheme.color.surface,
  ink: easyOpenTheme.color.ink, muted: easyOpenTheme.color.muted,
  border: easyOpenTheme.color.border, accent: easyOpenTheme.color.primary,
  accentTint: easyOpenTheme.color.primarySoft, green: easyOpenTheme.color.positive,
  greenBg: easyOpenTheme.color.positiveSoft, pale: easyOpenTheme.color.surfaceSoft,
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
  {id:'discover', name:'프로그램', glyph:'◇'},
  {id:'saved', name:'내 프로그램', glyph:'▣'},
  {id:'info', name:'설정', glyph:'⚙'},
];
const SERVER_STORAGE_KEY='easyopen.jellyfin.servers.v1';

function AppIcon({app, large = false}:{app:MobileApp;large?:boolean}) {
  const icon = iconKind(app);
  return <View style={[styles.appIcon, large && styles.appIconLarge, icon==='file' && styles.appIconGreen]}>
    <Text style={[styles.appGlyph, large && styles.appGlyphLarge, icon==='file' && styles.appGlyphGreen]}>{glyphs[icon]}</Text>
  </View>;
}

function Badge({children, soft = false}:{children:React.ReactNode;soft?:boolean}) {
  return <View style={[styles.badge,soft&&styles.badgeSoft]}><Text style={[styles.badgeText,soft&&styles.badgeTextSoft]}>{children}</Text></View>;
}

function AppRow({app, connected = false, onOpen}:{app:MobileApp;connected?:boolean;onOpen:()=>void}) {
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

export default function App() {
  const [apps,setApps] = useState<MobileApp[]>(bundledCatalog);
  const [page,setPage] = useState<MobilePage>('home');
  const [search,setSearch] = useState('');
  const [category,setCategory] = useState('전체');
  const [selected,setSelected] = useState<MobileApp | null>(null);
  const [advanced,setAdvanced] = useState(false);
  const [searchFocus,setSearchFocus] = useState(false);
  const [registry,setRegistry] = useState<ServerRegistry>(emptyServerRegistry);
  const [serversLoaded,setServersLoaded] = useState(false);
  const [serverName,setServerName] = useState('내 PC');
  const [serverAddress,setServerAddress] = useState('');
  const [activeServer,setActiveServer] = useState<SavedServer|null>(null);

  useEffect(()=>{
    let active = true;
    void fetchRemoteCatalog()
      .then(remote=>{const published=publicMobileApps(remote);if(active&&published.length)setApps(published);})
      .catch(()=>{});
    return ()=>{active=false;};
  },[]);

  useEffect(()=>{
    let active=true;
    void AsyncStorage.getItem(SERVER_STORAGE_KEY).then(value=>{
      if(active&&value)setRegistry(parseServerRegistry(JSON.parse(value)));
    }).catch(()=>{}).finally(()=>{if(active)setServersLoaded(true);});
    return()=>{active=false;};
  },[]);

  useEffect(()=>{
    if(!serversLoaded)return;
    void AsyncStorage.setItem(SERVER_STORAGE_KEY,JSON.stringify(registry)).catch(()=>{
      Alert.alert('서버 목록을 저장하지 못했어요','앱 저장 공간을 확인해 주세요.');
    });
  },[registry,serversLoaded]);

  const categories = useMemo(()=>mobileCategories(apps),[apps]);
  const managedApps = useMemo(()=>managedMobileApps(apps,registry.servers.length>0),[apps,registry.servers.length]);
  const visible = useMemo(()=>page==='saved'?managedApps:filterMobileApps(apps,search,category,[]),[apps,search,category,managedApps,page]);
  const featured = apps;

  function switchPage(next:MobilePage) {setPage(next);setCategory('전체');setSearch('');}
  function openDetail(app:MobileApp) {setAdvanced(false);setSelected(app);}
  async function goOfficial(app:MobileApp) {
    const url = getOfficialLink(app);
    if(!url) {Alert.alert('링크를 확인할 수 없어요','현재 등록된 공식 설치 링크를 다시 검토해야 해요.');return;}
    try {await Linking.openURL(url);}
    catch {Alert.alert('공식 페이지를 열 수 없어요','네트워크 연결이나 기기 설정을 확인해 주세요.');}
  }
  function registerServer(){
    const url=normalizeLanServerUrl(serverAddress);
    if(!url){Alert.alert('서버 주소를 확인해 주세요','같은 Wi-Fi의 사설 주소를 http://192.168.x.x:8096 형식으로 입력해 주세요.');return;}
    try{
      setRegistry(previous=>addServer(previous,{id:`manual:${url}`,name:serverName,url}));
      setServerAddress('');
    }catch{Alert.alert('서버를 등록하지 못했어요','기기 이름과 주소를 다시 확인해 주세요.');}
  }
  async function checkServer(server:SavedServer):Promise<boolean>{
    setRegistry(previous=>updateServerStatus(previous,server.id,'checking',server.lastCheckedAt));
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),4000);
    try{
      const response=await fetch(`${server.url}/System/Info/Public`,{headers:{Accept:'application/json'},signal:controller.signal});
      const data=await response.json() as {Id?:unknown;ServerName?:unknown};
      if(!response.ok||typeof data.Id!=='string'||typeof data.ServerName!=='string')throw new Error('invalid-response');
      setRegistry(previous=>updateServerStatus(previous,server.id,'online',new Date().toISOString()));
      return true;
    }catch{
      setRegistry(previous=>updateServerStatus(previous,server.id,'offline',new Date().toISOString()));
      return false;
    }finally{clearTimeout(timeout);}
  }
  async function useServer(server:SavedServer){
    if(!await checkServer(server)){Alert.alert('서버에 연결할 수 없어요','PC의 Jellyfin 실행 상태와 같은 Wi-Fi 연결을 확인해 주세요.');return;}
    setRegistry(previous=>setDefaultServer(previous,server.id));
    setActiveServer(server);
  }
  function startJellyfin(){
    const preferred=registry.servers.find(server=>server.id===registry.defaultServerId)??registry.servers[0];
    setSelected(null);
    if(preferred){void useServer(preferred);return;}
    switchPage('servers');
  }

  return <SafeAreaView style={styles.safe}>
    <StatusBar barStyle="dark-content"/>
    <View style={styles.topbar}>
      <View style={styles.brandMark}><Text style={styles.brandLetter}>e.</Text></View>
      <View style={styles.brandStack}><Text style={styles.brandTitle}>easy<Text style={styles.brandAccent}>open</Text></Text><Text style={styles.brandBy}>BY MANO</Text></View>
      <View style={styles.topbarSpace}/>
      <Badge soft>ANDROID BETA</Badge>
    </View>

    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
      {page==='home'&&<View style={styles.page}>
        <View style={styles.titleBlock}>
          <Text style={styles.eyebrow}>EASYOPEN MOBILE BETA</Text>
          <Text style={styles.pageTitle}>좋은 프로그램을 더 쉽게</Text>
          <Text style={styles.pageDescription}>복잡한 오픈소스 프로그램을 쉽게 시작하고 사용할 수 있도록 도와드려요.</Text>
        </View>
        <View style={styles.summaryGrid}>
          <Pressable accessibilityRole="button" onPress={()=>switchPage('discover')} style={[styles.summaryCard,styles.summaryMain]}>
            <Text style={styles.summaryLabel}>공개 프로그램</Text><Text style={styles.summaryCount}>{apps.length}<Text style={styles.summaryUnit}>개</Text></Text>
            <Text style={styles.summaryLink}>프로그램 보기  →</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={()=>switchPage('saved')} style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>내 프로그램</Text><Text style={styles.summaryCount}>{managedApps.length}<Text style={styles.summaryUnit}>개</Text></Text>
            <Text style={styles.summaryLink}>연결 상태 보기  →</Text>
          </Pressable>
        </View>
        <View style={styles.sectionLine}><Text style={styles.sectionTitle}>지원 프로그램</Text><Text style={styles.resultCount}>테스트 중</Text></View>
        <View style={styles.listCard}>{featured.map(app=><AppRow key={app.id} app={app} connected={managedApps.some(item=>item.id===app.id)} onOpen={()=>openDetail(app)}/>)}</View>
        <View style={styles.guidanceCard}>
          <View style={styles.guidanceDot}><Text style={styles.guidanceGlyph}>✓</Text></View>
          <View style={styles.flex1}><Text style={styles.guidanceTitle}>영상은 내 PC에 그대로 있어요</Text><Text style={styles.guidanceBody}>EasyOpen 모바일은 같은 Wi-Fi에 있는 내 PC의 Jellyfin 화면을 연결해 보여 줍니다.</Text></View>
        </View>
        <Text style={styles.footnote}>현재는 Jellyfin을 첫 번째 프로그램으로 테스트하고 있어요. 다른 프로그램은 준비가 끝난 뒤 추가됩니다.</Text>
      </View>}

      {page==='servers'&&<View style={styles.page}>
        <View style={styles.titleBlock}><Text style={styles.eyebrow}>CONNECT YOUR PC</Text><Text style={styles.pageTitle}>내 PC 연결</Text><Text style={styles.pageDescription}>영상이 있는 PC에서 Jellyfin을 실행한 뒤, 같은 Wi-Fi에서 연결해 주세요.</Text></View>
        <View style={styles.serverForm}>
          <Text style={styles.inputLabel}>기기 이름</Text><TextInput value={serverName} onChangeText={setServerName} placeholder="예: 거실 Windows PC" placeholderTextColor="#9AA2B1" style={styles.serverInput} accessibilityLabel="서버 기기 이름"/>
          <Text style={styles.inputLabel}>PC에 표시된 연결 주소</Text><TextInput value={serverAddress} onChangeText={setServerAddress} placeholder="예: 192.168.0.10:8096" placeholderTextColor="#9AA2B1" autoCapitalize="none" autoCorrect={false} keyboardType="url" style={styles.serverInput} accessibilityLabel="PC 연결 주소"/>
          <Pressable accessibilityRole="button" onPress={registerServer} style={styles.primaryButton}><Text style={styles.primaryLabel}>내 PC 연결하기</Text></Pressable>
          <Text style={styles.formHelp}>현재 베타에서는 EasyOpen Desktop에 표시된 주소를 직접 입력해야 해요. 계정과 비밀번호는 이 화면에 입력하지 않습니다.</Text>
        </View>
        <View style={styles.sectionLine}><Text style={styles.sectionTitle}>연결한 PC</Text><Text style={styles.resultCount}>{registry.servers.length}대</Text></View>
        {registry.servers.length===0?<View style={styles.emptyCard}><Text style={styles.emptyTitle}>아직 연결한 PC가 없어요</Text><Text style={styles.emptyDescription}>PC의 EasyOpen에서 Jellyfin을 실행하고 표시된 연결 주소를 위에 입력해 주세요.</Text></View>:<View style={styles.serverList}>{registry.servers.map(server=>{
          const isDefault=registry.defaultServerId===server.id;
          const statusLabel=server.status==='online'?'온라인':server.status==='offline'?'오프라인':server.status==='checking'?'확인 중':'확인 전';
          return <View key={server.id} style={[styles.serverCard,isDefault&&styles.serverCardDefault]}>
            <View style={styles.serverHeading}><View style={styles.flex1}><Text style={styles.serverName}>{server.name}</Text><Text style={styles.serverUrl}>{server.url}</Text></View>{isDefault&&<Badge>기본</Badge>}</View>
            <Text style={[styles.serverStatus,server.status==='online'&&styles.serverOnline]}>{statusLabel}{server.lastCheckedAt?` · ${new Date(server.lastCheckedAt).toLocaleString('ko-KR')}`:''}</Text>
            <View style={styles.serverActions}><Pressable accessibilityRole="button" disabled={server.status==='checking'} onPress={()=>void useServer(server)} style={[styles.smallButton,styles.useButton]}><Text style={styles.useButtonText}>사용하기</Text></Pressable><Pressable accessibilityRole="button" disabled={server.status==='checking'} onPress={()=>void checkServer(server)} style={styles.smallButton}><Text style={styles.smallButtonText}>상태 확인</Text></Pressable>{!isDefault&&<Pressable accessibilityRole="button" onPress={()=>setRegistry(previous=>setDefaultServer(previous,server.id))} style={styles.smallButton}><Text style={styles.smallButtonText}>기본으로</Text></Pressable>}<Pressable accessibilityRole="button" onPress={()=>Alert.alert('연결 정보를 삭제할까요?',`${server.name}의 모바일 연결 정보만 삭제하며 PC의 Jellyfin과 미디어는 삭제하지 않습니다.`,[{text:'취소',style:'cancel'},{text:'삭제',style:'destructive',onPress:()=>setRegistry(previous=>removeServer(previous,server.id))}])} style={styles.smallButton}><Text style={styles.removeText}>삭제</Text></Pressable></View>
          </View>;
        })}</View>}
      </View>}

      {(page==='discover'||page==='saved')&&<View style={styles.page}>
        <View style={styles.titleBlock}>
          <Text style={styles.eyebrow}>{page==='discover'?'SUPPORTED PROGRAMS':'MY PROGRAMS'}</Text>
          <Text style={styles.pageTitle}>{page==='discover'?'지원 프로그램':'내 프로그램'}</Text>
          <Text style={styles.pageDescription}>{page==='discover'?'EasyOpen에서 현재 확인할 수 있는 프로그램이에요.':'이 기기에서 연결해 둔 프로그램을 확인하세요.'}</Text>
        </View>
        {apps.length>1&&<><View style={[styles.searchBar,searchFocus&&styles.searchBarFocused]}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput value={search} onChangeText={setSearch} onFocus={()=>setSearchFocus(true)} onBlur={()=>setSearchFocus(false)} placeholder="앱 이름이나 기능 검색" placeholderTextColor="#9AA2B1" style={styles.searchInput} returnKeyType="search" accessibilityLabel="프로그램 검색"/>
          {search.length>0&&<Pressable accessibilityRole="button" accessibilityLabel="검색어 지우기" onPress={()=>setSearch('')}><Text style={styles.clear}>×</Text></Pressable>}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipsScroll}>
          {categories.map(item=><Pressable key={item} accessibilityRole="button" accessibilityState={{selected:category===item}} onPress={()=>setCategory(item)} style={[styles.chip,category===item&&styles.chipActive]}><Text style={[styles.chipText,category===item&&styles.chipTextActive]}>{item}</Text></Pressable>)}
        </ScrollView></>}
        <View style={styles.sectionLine}><Text style={styles.sectionTitle}>{page==='discover'?'전체 프로그램':'연결한 프로그램'}</Text><Text style={styles.resultCount}>{visible.length}개</Text></View>
        <View style={styles.listCard}>{visible.map(app=><AppRow key={app.id} app={app} connected={page==='saved'||managedApps.some(item=>item.id===app.id)} onOpen={()=>openDetail(app)}/>)}
          {visible.length===0&&<View style={styles.empty}><Text style={styles.emptySymbol}>{page==='saved'?'▣':'⌕'}</Text><Text style={styles.emptyTitle}>{page==='saved'?'아직 연결한 프로그램이 없어요':'검색 결과가 없어요'}</Text><Text style={styles.emptyDescription}>{page==='saved'?'Jellyfin 상세 화면에서 내 PC를 연결하면 여기에 표시됩니다.':'검색어나 카테고리를 변경해 보세요.'}</Text>{page==='saved'&&<Pressable onPress={()=>switchPage('discover')} style={styles.emptyButton}><Text style={styles.emptyButtonText}>프로그램 보기</Text></Pressable>}</View>}
        </View>
        <Text style={styles.footnote}>새로운 프로그램은 지원 준비가 끝나는 대로 이 목록에 추가됩니다.</Text>
      </View>}

      {page==='info'&&<View style={styles.page}>
        <View style={styles.titleBlock}><Text style={styles.eyebrow}>APP SETTINGS</Text><Text style={styles.pageTitle}>설정</Text><Text style={styles.pageDescription}>현재 베타의 연결 정보와 지원 범위를 확인하세요.</Text></View>
        <Pressable accessibilityRole="button" onPress={()=>switchPage('servers')} style={styles.infoCard}><Text style={styles.infoHeading}>내 PC 연결 관리  ›</Text><Text style={styles.infoParagraph}>저장된 Jellyfin PC {registry.servers.length}대 · 주소 확인, 상태 점검 및 삭제</Text></Pressable>
        <View style={styles.infoCard}><Text style={styles.infoHeading}>현재 지원 범위</Text><Text style={styles.infoParagraph}>같은 Wi-Fi에 있는 내 PC의 Jellyfin 연결을 테스트하고 있어요. Android 앱 직접 설치, 업데이트·제거와 결제 기능은 아직 제공하지 않습니다.</Text></View>
        <View style={styles.infoCard}><Text style={styles.infoHeading}>데이터와 개인정보</Text><Text style={styles.infoParagraph}>로그인을 요구하지 않으며, Jellyfin 계정과 비밀번호를 EasyOpen에 저장하지 않습니다. 등록한 PC 주소는 이 기기에만 저장됩니다.</Text></View>
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
          <View style={styles.detailNotice}><Text style={styles.detailNoticeTitle}>어떻게 사용하나요?</Text><Text style={styles.detailNoticeBody}>{usesEasyOpenClient(selected)?'영상이 있는 PC에서 Jellyfin을 실행하고 같은 Wi-Fi로 연결하면 EasyOpen 안에서 감상할 수 있어요.':'EasyOpen은 현재 Android 앱의 설치 상태를 확인하거나 직접 설치하지 않아요. 공식 스토어에서 설치를 진행해 주세요.'}</Text></View>
          {usesEasyOpenClient(selected)?<Pressable style={styles.primaryButton} accessibilityRole="button" onPress={startJellyfin}><Text style={styles.primaryLabel}>{registry.servers.length?'Jellyfin 열기':'내 PC 연결하기'}</Text></Pressable>:<Pressable style={styles.primaryButton} accessibilityRole="button" onPress={()=>void goOfficial(selected)}><Text style={styles.primaryLabel}>공식 설치 페이지 열기  ↗</Text></Pressable>}
          <View style={styles.detailSection}><Text style={styles.detailSectionTitle}>설치 전 확인</Text><Text style={styles.detailText}>{selected.requirements}</Text></View>
          {usesEasyOpenClient(selected)?<View style={styles.jellyfinGuide}>
            <View style={styles.guideIntro}><Text style={styles.guideEyebrow}>처음부터 차근차근</Text><Text style={styles.guideTitle}>Jellyfin 시작 가이드</Text><Text style={styles.guideDescription}>PC 준비부터 휴대폰 재생까지 아래 순서대로 진행하세요.</Text></View>
            {jellyfinMobileGuide.map((step,index)=><View key={step.title} style={styles.guideStep}><View style={styles.guideNumber}><Text style={styles.guideNumberText}>{index+1}</Text></View><View style={styles.flex1}><Text style={styles.guideStepTitle}>{step.title}</Text><Text style={styles.guideStepBody}>{step.body}</Text></View></View>)}
            <View style={styles.guideTrust}><Text style={styles.guideTrustIcon}>✓</Text><Text style={styles.guideTrustText}>서버 주소에는 계정·비밀번호·인증 토큰이 들어 있지 않아요.</Text></View>
          </View>:<View style={styles.detailSection}><Text style={styles.detailSectionTitle}>첫 사용 가이드</Text><Text style={styles.detailText}>{selected.guide}</Text></View>}
          <Pressable style={styles.advancedHeader} accessibilityRole="button" accessibilityState={{expanded:advanced}} onPress={()=>setAdvanced(!advanced)}><Text style={styles.advancedTitle}>기술 정보 및 라이선스</Text><Text style={styles.advancedArrow}>{advanced?'⌄':'›'}</Text></Pressable>
          {advanced&&<View style={styles.advancedBody}><Text style={styles.technical}>라이선스  {selected.license}</Text><Text style={styles.technical}>Android 패키지  {selected.install.android?.packageName??'정보 없음'}</Text><Text style={styles.technical}>EasyOpen 설치 검증  미완료</Text></View>}
          <Text style={styles.detailBottom}>설치 링크가 잘못되었거나 열리지 않는 경우 EasyOpen 웹사이트에서 공식 출처를 확인해 주세요.</Text>
        </ScrollView>}
      </SafeAreaView>
    </Modal>
    <Modal animationType="slide" presentationStyle="fullScreen" visible={Boolean(activeServer)} onRequestClose={()=>setActiveServer(null)}>
      <SafeAreaView style={styles.webSafe}>
        <View style={styles.webHeader}><View style={styles.flex1}><Text style={styles.webTitle}>{activeServer?.name??'Jellyfin'}</Text><Text style={styles.webAddress}>{activeServer?.url}</Text></View><Pressable accessibilityRole="button" onPress={()=>setActiveServer(null)} style={styles.closeButton}><Text style={styles.closeLabel}>닫기  ×</Text></Pressable></View>
        {activeServer&&jellyfinWebUrl(activeServer.url)&&<WebView
          source={{uri:jellyfinWebUrl(activeServer.url)!}}
          originWhitelist={[activeServer.url]}
          onShouldStartLoadWithRequest={request=>isAllowedJellyfinNavigation(activeServer.url,request.url)}
          javaScriptEnabled domStorageEnabled allowsFullscreenVideo mediaPlaybackRequiresUserAction={false}
          mixedContentMode="never" setSupportMultipleWindows={false}
          onError={()=>Alert.alert('Jellyfin 화면을 열지 못했어요','서버가 실행 중인지 확인한 뒤 다시 시도해 주세요.')}
          style={styles.webView}/>
        }
      </SafeAreaView>
    </Modal>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:colors.background},
  flex1:{flex:1}, pressed:{backgroundColor:'#FAFBFD'},
  topbar:{height:72,paddingHorizontal:22,flexDirection:'row',alignItems:'center',backgroundColor:colors.paper,borderBottomWidth:1,borderBottomColor:colors.border},
  brandMark:{width:38,height:38,borderRadius:easyOpenTheme.radius.md,backgroundColor:colors.accent,alignItems:'center',justifyContent:'center',marginRight:10},
  brandLetter:{fontSize:24,fontWeight:'900',fontStyle:'italic',color:colors.paper,letterSpacing:-2,marginTop:-2},
  brandStack:{gap:1},brandTitle:{fontSize:19,fontWeight:'800',color:colors.ink,letterSpacing:-0.8},brandAccent:{color:colors.accent},brandBy:{fontSize:8,fontWeight:'700',letterSpacing:1.5,color:colors.muted},topbarSpace:{flex:1},
  badge:{paddingHorizontal:10,paddingVertical:6,borderRadius:8,backgroundColor:colors.greenBg},badgeText:{fontSize:10,fontWeight:'800',color:colors.green},
  badgeSoft:{backgroundColor:colors.accentTint},badgeTextSoft:{color:colors.accent},
  scrollContent:{flexGrow:1,paddingBottom:40},page:{paddingHorizontal:21,paddingTop:26},titleBlock:{marginBottom:25},
  eyebrow:{fontSize:10,color:colors.accent,letterSpacing:1.7,fontWeight:'800'},pageTitle:{fontSize:25,letterSpacing:-0.7,lineHeight:34,fontWeight:'800',color:colors.ink,marginTop:7},
  pageDescription:{fontSize:13,lineHeight:20,color:colors.muted,marginTop:8},
  summaryGrid:{flexDirection:'row',gap:10,marginBottom:29},summaryCard:{flex:1,backgroundColor:colors.paper,borderColor:colors.border,borderWidth:1,borderRadius:easyOpenTheme.radius.lg,padding:16,minHeight:139,justifyContent:'space-between'},summaryMain:{backgroundColor:'#f5f1ff',borderColor:'#e7dff8'},summaryLabel:{fontSize:12,color:colors.muted,fontWeight:'600'},summaryCount:{fontSize:31,color:colors.ink,fontWeight:'800'},summaryUnit:{fontSize:13,color:colors.muted,fontWeight:'600'},summaryLink:{fontSize:11,color:colors.accent,fontWeight:'800'},
  sectionLine:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:13},sectionTitle:{fontSize:16,fontWeight:'800',color:colors.ink},textAction:{fontSize:12,fontWeight:'700',color:colors.accent},resultCount:{fontSize:12,color:colors.muted},
  listCard:{borderRadius:easyOpenTheme.radius.lg,backgroundColor:colors.paper,borderWidth:1,borderColor:colors.border,overflow:'hidden'},
  appRow:{paddingHorizontal:14,paddingVertical:15,flexDirection:'row',alignItems:'center',borderBottomWidth:1,borderBottomColor:'#F0F1F5',minHeight:88},
  appIcon:{width:48,height:48,borderRadius:14,backgroundColor:easyOpenTheme.color.darkSurface,alignItems:'center',justifyContent:'center',marginRight:12,shadowColor:'#292347',shadowOpacity:.12,shadowRadius:8,shadowOffset:{width:0,height:5},elevation:3},appIconGreen:{backgroundColor:easyOpenTheme.color.darkSurface},appGlyph:{fontSize:23,fontWeight:'800',color:'#bfa4ff'},appGlyphGreen:{color:'#bfa4ff'},appIconLarge:{width:62,height:62,borderRadius:18},appGlyphLarge:{fontSize:29},
  rowBody:{flex:1},rowTitle:{fontSize:14,fontWeight:'800',color:colors.ink},rowSummary:{fontSize:12,lineHeight:18,color:colors.muted,marginTop:3},rowFoot:{flexDirection:'row',alignItems:'center',marginTop:6},rowCategory:{color:colors.accent,fontSize:10,fontWeight:'700'},rowSaved:{fontSize:10,color:colors.green,fontWeight:'700'},chevron:{fontSize:25,color:'#AFB7C5',paddingLeft:11},
  guidanceCard:{backgroundColor:'#EDF3F5',borderRadius:14,padding:16,flexDirection:'row',alignItems:'flex-start',gap:12,marginTop:19},guidanceDot:{width:24,height:24,borderRadius:12,backgroundColor:colors.green,alignItems:'center',justifyContent:'center'},guidanceGlyph:{color:'white',fontWeight:'800',fontSize:12},guidanceTitle:{fontSize:13,color:colors.ink,fontWeight:'800'},guidanceBody:{fontSize:11,lineHeight:18,color:'#667A80',marginTop:5},
  footnote:{fontSize:11,lineHeight:18,color:colors.muted,marginTop:18,marginBottom:18},
  searchBar:{height:49,backgroundColor:colors.paper,borderRadius:12,borderWidth:1,borderColor:colors.border,flexDirection:'row',alignItems:'center',paddingHorizontal:13},searchBarFocused:{borderColor:colors.accent},searchIcon:{fontSize:24,color:colors.muted,marginRight:9},searchInput:{flex:1,fontSize:14,color:colors.ink,paddingVertical:8},clear:{fontSize:24,color:colors.muted,paddingHorizontal:7},
  chipsScroll:{marginTop:14,marginBottom:23},chips:{gap:8,alignItems:'center'},chip:{borderWidth:1,borderColor:colors.border,backgroundColor:colors.paper,borderRadius:20,paddingHorizontal:14,paddingVertical:9},chipActive:{backgroundColor:colors.ink,borderColor:colors.ink},chipText:{fontSize:11,color:colors.muted,fontWeight:'700'},chipTextActive:{color:'white'},
  empty:{alignItems:'center',paddingHorizontal:20,paddingVertical:40},emptySymbol:{fontSize:30,color:'#C3C8D2'},emptyTitle:{fontSize:14,fontWeight:'800',color:colors.ink,marginTop:5},emptyDescription:{fontSize:12,textAlign:'center',lineHeight:20,color:colors.muted,marginTop:7},emptyButton:{padding:12,marginTop:15},emptyButtonText:{color:colors.accent,fontWeight:'800',fontSize:12},
  bottomNav:{height:76,backgroundColor:'rgba(255,255,255,0.97)',borderTopWidth:1,borderTopColor:colors.border,flexDirection:'row',paddingHorizontal:9,paddingBottom:5},navItem:{flex:1,alignItems:'center',justifyContent:'center',gap:4,minHeight:48},navGlyph:{fontSize:22,color:'#a7a0b2',fontWeight:'500'},navLabel:{fontSize:10,fontWeight:'700',color:'#a7a0b2'},navSelected:{color:colors.accent},navIndicator:{position:'absolute',top:0,width:28,height:3,backgroundColor:colors.accent,borderBottomLeftRadius:4,borderBottomRightRadius:4},
  infoCard:{backgroundColor:colors.paper,borderRadius:14,padding:18,borderWidth:1,borderColor:colors.border,marginBottom:12},infoHeading:{fontSize:14,fontWeight:'800',color:colors.ink},infoParagraph:{fontSize:12,lineHeight:21,color:colors.muted,marginTop:9},
  serverForm:{backgroundColor:colors.paper,borderRadius:16,borderWidth:1,borderColor:colors.border,padding:16,marginBottom:28},inputLabel:{fontSize:11,fontWeight:'800',color:colors.ink,marginBottom:7},serverInput:{height:46,borderWidth:1,borderColor:colors.border,borderRadius:10,paddingHorizontal:12,fontSize:13,color:colors.ink,marginBottom:14},formHelp:{fontSize:10,lineHeight:17,color:colors.muted,marginTop:12},emptyCard:{backgroundColor:colors.paper,borderWidth:1,borderColor:colors.border,borderRadius:16,padding:24,alignItems:'center'},serverList:{gap:10},serverCard:{backgroundColor:colors.paper,borderWidth:1,borderColor:colors.border,borderRadius:15,padding:15},serverCardDefault:{borderColor:'#C9CDF7'},serverHeading:{flexDirection:'row',alignItems:'flex-start',gap:10},serverName:{fontSize:14,fontWeight:'800',color:colors.ink},serverUrl:{fontSize:11,color:colors.muted,marginTop:5},serverStatus:{fontSize:11,fontWeight:'700',color:colors.muted,marginTop:12},serverOnline:{color:colors.green},serverActions:{flexDirection:'row',gap:7,marginTop:13,flexWrap:'wrap'},smallButton:{borderWidth:1,borderColor:colors.border,borderRadius:9,paddingHorizontal:11,paddingVertical:8},smallButtonText:{fontSize:11,fontWeight:'700',color:colors.accent},removeText:{fontSize:11,fontWeight:'700',color:'#A34A4A'},
  useButton:{backgroundColor:colors.accent,borderColor:colors.accent},useButtonText:{fontSize:11,fontWeight:'800',color:'white'},webSafe:{flex:1,backgroundColor:colors.paper},webHeader:{minHeight:62,paddingHorizontal:14,flexDirection:'row',alignItems:'center',borderBottomWidth:1,borderBottomColor:colors.border},webTitle:{fontSize:14,fontWeight:'800',color:colors.ink},webAddress:{fontSize:10,color:colors.muted,marginTop:3},webView:{flex:1,backgroundColor:colors.background},
  modalSafe:{flex:1,backgroundColor:colors.paper},modalHeader:{height:57,paddingHorizontal:19,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderBottomColor:colors.border},modalCaption:{fontWeight:'800',color:colors.ink,fontSize:14},closeButton:{padding:9},closeLabel:{color:colors.accent,fontWeight:'700',fontSize:13},detailContent:{padding:21,paddingBottom:70},
  detailHeading:{flexDirection:'row',alignItems:'center',gap:4},detailHeadingText:{flex:1},detailCategory:{fontSize:11,color:colors.accent,fontWeight:'700'},detailTitle:{fontSize:25,fontWeight:'800',color:colors.ink,letterSpacing:-0.6,marginTop:5},detailSummary:{fontSize:13,lineHeight:20,color:colors.muted,marginTop:14},
  detailNotice:{padding:16,borderRadius:13,backgroundColor:'#EFF1FB',marginTop:24,marginBottom:18},detailNoticeTitle:{fontSize:12,fontWeight:'800',color:colors.accent},detailNoticeBody:{fontSize:12,lineHeight:20,color:'#66719A',marginTop:6},
  jellyfinGuide:{marginTop:27,borderWidth:1,borderColor:'#DEE1F8',borderRadius:17,backgroundColor:'#FAFAFF',overflow:'hidden'},guideIntro:{padding:18,borderBottomWidth:1,borderBottomColor:'#E8EAF7'},guideEyebrow:{fontSize:9,fontWeight:'900',letterSpacing:1.4,color:colors.accent},guideTitle:{fontSize:18,fontWeight:'900',letterSpacing:-0.4,color:colors.ink,marginTop:7},guideDescription:{fontSize:12,lineHeight:19,color:colors.muted,marginTop:7},guideStep:{flexDirection:'row',gap:12,paddingHorizontal:17,paddingVertical:15,borderBottomWidth:1,borderBottomColor:'#ECEEF6'},guideNumber:{width:28,height:28,borderRadius:9,alignItems:'center',justifyContent:'center',backgroundColor:colors.accent},guideNumberText:{fontSize:11,fontWeight:'900',color:'white'},guideStepTitle:{fontSize:13,fontWeight:'900',color:colors.ink,marginTop:1},guideStepBody:{fontSize:11,lineHeight:18,color:colors.muted,marginTop:5},guideTrust:{margin:12,padding:12,borderRadius:11,backgroundColor:colors.greenBg,flexDirection:'row',alignItems:'flex-start',gap:9},guideTrustIcon:{width:20,height:20,borderRadius:10,textAlign:'center',lineHeight:20,backgroundColor:colors.green,color:'white',fontSize:10,fontWeight:'900'},guideTrustText:{flex:1,fontSize:10,lineHeight:17,color:'#4D7769'},
  primaryButton:{height:50,backgroundColor:colors.accent,borderRadius:easyOpenTheme.radius.md,justifyContent:'center',alignItems:'center'},primaryLabel:{color:'white',fontSize:13,fontWeight:'800'},secondaryButton:{height:47,marginTop:9,borderRadius:easyOpenTheme.radius.md,borderWidth:1,borderColor:colors.border,alignItems:'center',justifyContent:'center'},secondaryLabel:{fontSize:13,color:colors.accent,fontWeight:'700'},
  detailSection:{marginTop:27,paddingBottom:19,borderBottomWidth:1,borderBottomColor:colors.border},detailSectionTitle:{fontSize:15,fontWeight:'800',color:colors.ink,marginBottom:10},detailText:{fontSize:13,lineHeight:23,color:'#657080'},advancedHeader:{paddingVertical:17,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},advancedTitle:{fontSize:13,fontWeight:'700',color:colors.ink},advancedArrow:{fontSize:24,color:colors.muted},advancedBody:{backgroundColor:colors.background,borderRadius:12,padding:16,gap:12},technical:{fontSize:12,lineHeight:19,color:colors.muted},detailBottom:{fontSize:11,lineHeight:18,color:colors.muted,marginTop:23},
});
