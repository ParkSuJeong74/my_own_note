import {currentSession} from '@/lib/request-auth';
import {listEntitlements} from '@/lib/repository';
import {activeEntitlements} from '@/lib/entitlements';
import styles from '../workspace.module.css';
export const dynamic = 'force-dynamic';
const labels: Record<string, string> = {'commercial:jellyfin-plus': 'Jellyfin Plus','commercial:cosyvoice-studio': 'CosyVoice Studio'};
export default async function PurchasesPage() {
  const session = await currentSession();
  if (!session) return <><h1 className={styles.heading}>이용 권한</h1><section className={styles.card}><h2>구매할 때 사용한 계정으로 로그인하세요.</h2><a className={styles.button} href="/v1/auth/google/start?returnTo=%2Fworkspace%2Fpurchases">Google로 로그인</a></section></>;
  let keys: string[];
  try {keys = activeEntitlements(await listEntitlements(session.userId));}
  catch {return <><h1 className={styles.heading}>이용 권한</h1><p className={styles.error} role="alert">이용 권한을 조회하지 못했어요. 잠시 후 다시 확인해 주세요.</p><a className={styles.button} href="/workspace/purchases">다시 확인</a></>;}
  return <><h1 className={styles.heading}>이용 권한</h1><p className={styles.description}>{session.email} 계정에 등록된 현재 권한입니다.</p><section className={styles.card}><h2>{keys.length ? '이용 가능한 에디션' : '등록된 유료 이용 권한이 없어요.'}</h2><ul className={styles.list}>{keys.map(key=><li key={key}>{labels[key]??key}</li>)}</ul><p>관리자 부여 권한도 포함될 수 있습니다. 실제 결제 주문과 환불 내역은 결제 연동 후 제공합니다.</p></section></>;
}
