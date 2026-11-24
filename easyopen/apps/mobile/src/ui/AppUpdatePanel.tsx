import React,{useEffect,useMemo,useState} from 'react';
import {Alert,Linking,Platform,Pressable,Text,View} from 'react-native';
import * as Updates from 'expo-updates';
import {createAppUpdates,type UpdatePhase} from '../app-updates';
import {styles} from './styles';
const messages:Record<UpdatePhase,string>={
  disabled:'이 빌드는 화면 자동 업데이트가 연결되지 않았어요. 앱 전체 업데이트는 설치한 배포 채널을 이용해 주세요.',
  idle:'화면 업데이트를 확인할 수 있어요.',checking:'새 화면 업데이트를 확인하고 있어요.',
  current:'현재 이 앱과 호환되는 최신 화면이에요. 앱 전체의 최신 버전 여부는 배포 채널에서 확인하세요.',
  available:'새 화면 업데이트가 있어요. 다운로드 후 재시작하면 적용돼요.',
  downloading:'화면 업데이트를 다운로드하고 있어요.',ready:'업데이트 준비 완료. 재시작하면 적용돼요.',
  error:'업데이트를 받지 못했어요. 현재 화면은 계속 사용할 수 있어요.',
};
export function AppUpdatePanel({visible=true}:{visible?:boolean}){
  const [phase,setPhase]=useState<UpdatePhase>(Platform.OS!=='web'&&Updates.isEnabled?'idle':'disabled');
  const updater=useMemo(()=>createAppUpdates({...Updates,isEnabled:Platform.OS!=='web'&&Updates.isEnabled},setPhase),[]);
  useEffect(()=>{void updater.check();},[updater]);
  const busy=phase==='checking'||phase==='downloading';
  function act(){
    if(phase==='ready'){
      Alert.alert('화면 업데이트 적용','진행 중인 재생이나 입력을 마친 뒤 재시작해 주세요.',[
        {text:'나중에',style:'cancel'},
        {text:'재시작',onPress:()=>{void updater.restart();}},
      ]);
    }else if(phase==='available'){void updater.download();}
    else{void updater.check();}
  }
  if(!visible&&!['available','downloading','ready'].includes(phase))return null;
  return <View style={styles.infoCard}>
    <Text style={styles.infoHeading}>EasyOpen 업데이트</Text>
    <Text accessibilityLiveRegion="polite" style={styles.infoParagraph}>{messages[phase]}</Text>
    {phase!=='disabled'&&<Pressable accessibilityRole="button" disabled={busy} onPress={act} style={styles.secondaryButton}>
      <Text style={styles.secondaryLabel}>{busy?'처리 중…':phase==='ready'?'재시작해 적용':phase==='available'?'업데이트 다운로드':'업데이트 확인'}</Text>
    </Pressable>}
    <Pressable accessibilityRole="link" style={styles.secondaryButton} onPress={()=>{void Linking.openURL('https://easy-open.mano.io.kr/download/').catch(()=>Alert.alert('열기 실패','다운로드 페이지를 열지 못했어요.'));}}>
      <Text style={styles.secondaryLabel}>앱 전체 업데이트 안내 ↗</Text>
    </Pressable>
  </View>;
}
