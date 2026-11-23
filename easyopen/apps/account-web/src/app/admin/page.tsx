import {currentSession,requireAdmin} from '@/lib/request-auth';
import {listUsers} from '@/lib/repository';
import styles from './admin.module.css';

export const dynamic='force-dynamic';

type UserRow={id:string;email:string;display_name:string|null;created_at:Date;last_login_at:Date|null};
const date=(value:Date|null)=>value?new Intl.DateTimeFormat('ko-KR',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Seoul'}).format(new Date(value)):'—';

export default async function AdminPage(){
  const session=await currentSession();
  if(!session)return <main className={styles.page}><section className={`${styles.card} ${styles.login}`}><p className={styles.eyebrow}>EASYOPEN ADMIN</p><h1>관리자 로그인</h1><p>허용된 Google 계정으로 로그인하면 EasyOpen 회원과 이용 권한을 관리할 수 있습니다.</p><a className={styles.button} href="/v1/auth/google/start?returnTo=%2Fadmin">Google로 로그인</a></section></main>;
  const admin=await requireAdmin();
  if(!admin)return <main className={styles.page}><section className={`${styles.card} ${styles.login}`}><p className={styles.eyebrow}>ACCESS DENIED</p><h1>접근할 수 없습니다</h1><p className={styles.notice}>{session.email} 계정은 관리자 allowlist에 없습니다.</p><form action="/admin/logout" method="post"><button className={`${styles.button} ${styles.secondary}`} type="submit">로그아웃</button></form></section></main>;
  const users=await listUsers() as UserRow[];
  return <main className={styles.page}><div className={styles.shell}><header className={styles.header}><div><p className={styles.eyebrow}>EASYOPEN ADMIN</p><h1>회원 관리</h1><p>최근 가입한 회원을 최대 200명까지 표시합니다.</p></div><form className={styles.logout} action="/admin/logout" method="post"><button className={`${styles.button} ${styles.secondary}`} type="submit">로그아웃</button></form></header><section className={styles.card}><div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>이름</th><th>이메일</th><th>가입일</th><th>최근 로그인</th></tr></thead><tbody>{users.map(user=><tr key={user.id}><td>{user.display_name||<span className={styles.muted}>이름 없음</span>}</td><td>{user.email}</td><td>{date(user.created_at)}</td><td>{date(user.last_login_at)}</td></tr>)}</tbody></table></div>{users.length===0&&<p className={styles.muted}>아직 가입한 회원이 없습니다.</p>}</section></div></main>;
}
