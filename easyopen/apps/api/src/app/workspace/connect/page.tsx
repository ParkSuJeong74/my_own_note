import {currentSession} from '@/lib/request-auth';
import styles from '../workspace.module.css';
export const dynamic='force-dynamic';
export default async function ConnectPage(){
  const session=await currentSession();
  return <><h1 className={styles.heading}>앱 계정 연결</h1><section className={styles.card}>{session?<><h2>이 계정을 기기의 EasyOpen에 연결합니다.</h2><p>{session.email}</p><p>직접 실행한 앱에 표시된 코드만 입력하세요. 다른 사람이 보내준 코드는 승인하지 마세요. 연결하면 이 기기에서 계정과 이용 권한을 조회할 수 있습니다.</p><form className={styles.connectForm} action="/workspace/connect/approve" method="post"><label htmlFor="userCode">앱 연결 코드</label><input id="userCode" name="userCode" required maxLength={20} placeholder="ABCD-1234-EF56" autoComplete="off"/><button className={styles.button} type="submit">이 계정으로 앱 연결 승인</button></form></>:<><h2>기기에 연결할 Google 계정으로 로그인하세요.</h2><a className={styles.button} href="/v1/auth/google/start?returnTo=%2Fworkspace%2Fconnect">Google로 로그인</a></>}</section></>;
}
