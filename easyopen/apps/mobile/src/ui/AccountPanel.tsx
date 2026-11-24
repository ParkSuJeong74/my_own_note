import React,{useEffect,useState} from 'react';
import {Linking,Platform,Pressable,Text,View} from 'react-native';
import type {AccountState} from '@easyopen/account-client';
import {accountClient} from '../account';
import {styles} from './styles';
export function AccountPanel(){
  const [state,setState]=useState<AccountState|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  async function action(kind:'begin'|'check'|'logout'){
    setBusy(true);setError('');
    try{setState(await accountClient[kind]());if(kind==='begin')await Linking.openURL('https://easyopen-api.mano.io.kr/workspace/connect');}
    catch{setError('계정 연결을 처리하지 못했어요. 저장소와 네트워크를 확인하세요.');}finally{setBusy(false);}
  }
  useEffect(()=>{if(Platform.OS!=='web')void action('check');},[]);
  useEffect(()=>{if(state?.status!=='pending')return;const timer=setInterval(()=>{if(!busy)void action('check');},5500);return()=>clearInterval(timer);},[state?.status,busy]);
  if(Platform.OS==='web')return <View style={styles.infoCard}><Text style={styles.infoHeading}>이 기기의 계정 연결</Text><Text style={styles.infoParagraph}>레이아웃 미리보기입니다. 안전한 계정 연결은 설치한 Android·iPhone 앱에서 이용하세요.</Text></View>;
  return <View style={styles.infoCard}><Text style={styles.infoHeading}>이 기기의 계정 연결</Text>{state?.email&&<Text style={styles.infoParagraph}>{state.email}</Text>}<Text style={styles.infoParagraph} accessibilityLiveRegion="polite">{error||state?.message||'계정 상태 확인 중'}</Text>{state?.userCode&&<Text selectable style={styles.infoHeading}>연결 코드: {state.userCode}</Text>}{state?.status==='connected'&&<Text style={styles.infoParagraph}>{state.entitlements.length?'등록된 이용 권한: '+state.entitlements.join(', '):'등록된 유료 이용 권한이 없습니다.'}</Text>}{state?.status==='signed-out'&&<Pressable accessibilityRole="button" disabled={busy} style={styles.primaryButton} onPress={()=>void action('begin')}><Text style={styles.primaryLabel}>Google 계정 연결 ↗</Text></Pressable>}{state?.status==='pending'&&<Pressable accessibilityRole="button" style={styles.secondaryButton} onPress={()=>{void Linking.openURL('https://easyopen-api.mano.io.kr/workspace/connect').catch(()=>setError('브라우저를 열지 못했어요.'));}}><Text style={styles.secondaryLabel}>브라우저에서 승인하기 ↗</Text></Pressable>}<Pressable accessibilityRole="button" disabled={busy} style={styles.secondaryButton} onPress={()=>void action('check')}><Text style={styles.secondaryLabel}>연결 상태 확인</Text></Pressable>{state&&state.status!=='signed-out'&&<Pressable accessibilityRole="button" disabled={busy} style={styles.secondaryButton} onPress={()=>void action('logout')}><Text style={styles.secondaryLabel}>{state.status==='pending'?'연결 취소':'앱 로그아웃'}</Text></Pressable>}<Text style={styles.infoParagraph}>무료 PC 연결은 로그인 없이 이용할 수 있습니다.</Text></View>;
}
