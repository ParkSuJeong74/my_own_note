import type { AppInfo } from '@/lib/catalog';
import Link from 'next/link';
export function AppCard({app}: {app: AppInfo}) {
 const content=<><div className="card-top"><span className="app-icon" aria-hidden="true">{app.icon}</span><span className={`support-pill ${app.slug==='jellyfin'?`support-${app.supportStatus}`:'support-disabled'}`}>{app.slug==='jellyfin'?app.supportLabel:'지원 예정'}</span></div><div className="card-body"><span className="card-category">{app.category}</span><h3>{app.name}</h3><p>{app.summary}</p></div><div className="card-tags"><span>{app.slug==='jellyfin'?app.level:'현재 비활성화'}</span><span>·</span><span>{app.os.slice(0,2).join(' · ')}</span></div><div className="card-foot"><span>{app.slug==='jellyfin'?'Jellyfin 사용 방법 보기':'Jellyfin 검증 후 순차 지원'}</span>{app.slug==='jellyfin'&&<span aria-hidden="true">→</span>}</div></>;
 return app.slug==='jellyfin'?<Link href="/apps/jellyfin/" className="app-card">{content}</Link>:<article className="app-card app-card-disabled" aria-disabled="true">{content}</article>;
}
