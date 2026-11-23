import Link from 'next/link';
import {currentSession} from '@/lib/request-auth';
import styles from './workspace.module.css';
export const dynamic = 'force-dynamic';
export default async function WorkspacePage() {
  const session = await currentSession();
  return <>
    <h1 className={styles.heading}>내 계정</h1><p className={styles.description}>계정과 프로그램 이용 권한을 한곳에서 확인하세요.</p>
    <section className={styles.card}><h2>{session ? '로그인한 계정' : '구매 권한을 계정에 연결하세요.'}</h2>
      {session ? <><p>{session.email}</p><div className={styles.actions}>
        <Link className={styles.button} href="/workspace/purchases">이용 권한 확인</Link>
        <form action="/workspace/logout" method="post"><button className={styles.button}>로그아웃</button></form>
      </div></> : <><p>Google 계정으로 로그인하면 서버에 등록된 이용 권한을 확인할 수 있어요.</p><a className={styles.button} href="/v1/auth/google/start?returnTo=%2Fworkspace">Google로 로그인</a></>}
    </section>
    <div className={styles.notice}>무료 프로그램의 설치·실행과 내 PC 연결은 기기의 EasyOpen 앱에서 이용합니다.</div>
  </>;
}
