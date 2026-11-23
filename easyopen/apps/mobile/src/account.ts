import * as SecureStore from 'expo-secure-store';
import {Platform} from 'react-native';
import {AccountClient} from '@easyopen/account-client';
const key='easyopen.account.session.v1';
export const accountClient=new AccountClient({
  async ready(){if(!await SecureStore.isAvailableAsync())throw new Error('이 기기에서 안전한 계정 저장소를 사용할 수 없습니다.');},
  async get(){return SecureStore.getItemAsync(key);},
  async set(token){await SecureStore.setItemAsync(key,token,{keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY});},
  async clear(){await SecureStore.deleteItemAsync(key);},
},Platform.OS==='ios'?'ios':'android');
