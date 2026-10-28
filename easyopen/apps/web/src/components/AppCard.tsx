import type { AppInfo } from '@/lib/catalog';
import Link from 'next/link';
export function AppCard({app}: {app: AppInfo}) {
 const content=<><div className="card-top"><span className="app-icon" aria-hidden="true">{app.icon}</span><span className={`support-pill support-${app.supportStatus}`}>{app.supportLabel}</span></div><div className="card-body"><span className="card-category">{app.category}</span><h3>{app.name}</h3><p>{app.summary}</p></div><div className="card-tags"><span>{app.os.slice(0,2).join(' · ')}</span></div>{app.slug==='jellyfin'&&<div className="card-foot"><span>검증 상태와 안내 보기</span><span aria-hidden="true">→</span></div>}</>;
 return app.slug==='jellyfin'?<Link href="/apps/jellyfin/" className="app-card">{content}</Link>:<article className="app-card app-card-disabled">{content}<a className="card-source-link" href={app.official} target="_blank" rel="noreferrer noopener" aria-label={`${app.name} 공식 출처 새 창에서 보기`}>공식 출처 보기 <span aria-hidden="true">↗</span></a></article>;
}
