import {MobileNavigation} from './src/ui/MobileNavigation';
import {HomeScreen} from './src/screens/HomeScreen';
import React, {useEffect, useMemo, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Alert, Linking, Modal, Platform, Pressable, SafeAreaView, ScrollView, StatusBar, Text, TextInput, View} from 'react-native';
import {StartupSplash} from './src/StartupSplash';
import {WebView} from 'react-native-webview';
import {styles} from './src/ui/styles';
import {Badge, AppIcon, AppRow} from './src/ui/ProgramRow';
import {jellyfinMobileGuide} from './src/jellyfin-guide';
import list from './src/catalog.generated.json';
import {fetchRemoteCatalog, validateCatalog} from './src/catalog';
import {filterMobileApps, getOfficialLink, managedMobileApps, mobileCategories, publicMobileApps, usesEasyOpenClient, type MobileApp, type MobilePage} from './src/mobile-view-model';
import {addServer, emptyServerRegistry, isAllowedJellyfinNavigation, jellyfinWebUrl, normalizeLanServerUrl, parseServerRegistry, removeServer, setDefaultServer, updateServerStatus, type SavedServer, type ServerRegistry} from './src/server-registry';

const bundledCatalog = publicMobileApps(validateCatalog(list));


const SERVER_STORAGE_KEY='easyopen.jellyfin.servers.v1';

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

  return <View style={styles.startupHost}><SafeAreaView style={styles.safe}>
    <StatusBar barStyle="dark-content"/>
    <View style={styles.topbar}>
      <View style={styles.brandMark}><Text style={styles.brandLetter}>e.</Text></View>
      <View style={styles.brandStack}><Text style={styles.brandTitle}>easy<Text style={styles.brandAccent}>open</Text></Text><Text style={styles.brandBy}>BY MANO</Text></View>
      <View style={styles.topbarSpace}/>
      <Badge soft>{Platform.OS==='ios'?'IOS BETA':'ANDROID BETA'}</Badge>
    </View>

    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
      {page==='home'&&<HomeScreen serverCount={registry.servers.length} managedApps={managedApps} featured={featured} onNavigate={switchPage} onOpen={openDetail}/>}

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
        <Pressable accessibilityRole="button" onPress={()=>{void Linking.openURL('https://easyopen-api.mano.io.kr/workspace').catch(()=>Alert.alert('열기 실패','브라우저를 열지 못했어요. 잠시 후 다시 시도해 주세요.'));}} style={styles.infoCard}><Text style={styles.infoHeading}>계정과 이용 권한  ↗</Text><Text style={styles.infoParagraph}>브라우저에서 Google 로그인과 등록된 이용 권한을 확인합니다. 결제 서비스는 준비 중입니다.</Text></Pressable>

        <View style={styles.titleBlock}><Text style={styles.eyebrow}>APP SETTINGS</Text><Text style={styles.pageTitle}>설정</Text><Text style={styles.pageDescription}>현재 베타의 연결 정보와 지원 범위를 확인하세요.</Text></View>
        <Pressable accessibilityRole="button" onPress={()=>switchPage('servers')} style={styles.infoCard}><Text style={styles.infoHeading}>내 PC 연결 관리  ›</Text><Text style={styles.infoParagraph}>저장된 Jellyfin PC {registry.servers.length}대 · 주소 확인, 상태 점검 및 삭제</Text></Pressable>
        <View style={styles.infoCard}><Text style={styles.infoHeading}>현재 지원 범위</Text><Text style={styles.infoParagraph}>같은 Wi-Fi에 있는 내 PC의 Jellyfin 연결을 테스트하고 있어요. Android 앱 직접 설치, 업데이트·제거와 결제 기능은 아직 제공하지 않습니다.</Text></View>
        <View style={styles.infoCard}><Text style={styles.infoHeading}>데이터와 개인정보</Text><Text style={styles.infoParagraph}>무료 PC 연결은 로그인 없이 이용하며, 온라인 계정 기능은 별도 브라우저에서 로그인합니다. Jellyfin 계정과 비밀번호를 EasyOpen에 저장하지 않습니다. 등록한 PC 주소는 이 기기에만 저장됩니다.</Text></View>
      </View>}
    </ScrollView>

    <MobileNavigation page={page} onNavigate={switchPage}/>

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
  </SafeAreaView><StartupSplash/></View>;
}
