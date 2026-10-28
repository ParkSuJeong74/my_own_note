import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import JellyfinUsageGuide from '@/components/JellyfinUsageGuide';
import {getApp} from '@/lib/catalog';

export function generateStaticParams(){return [{slug:'jellyfin'}];}

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
  const {slug}=await params;
  const app=getApp(slug);
  return {title:app?.name??'지원 도구',description:app?.summary};
}

export default async function AppPage({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  if(slug!=='jellyfin')notFound();
  const app=getApp(slug);
  if(!app)notFound();
  return <>
    <section className="shell page-section detail-page jellyfin-detail-intro">
      <div className="breadcrumb"><Link href="/apps/">지원 도구</Link><span>›</span><span>Jellyfin</span></div>
      <div className="detail-head"><div className="detail-icon" aria-hidden="true">{app.icon}</div><div className="detail-title"><div className="eyebrow-sub">{app.category}</div><h1>{app.name}</h1><p>{app.summary}</p><div className="detail-badges"><span className={`support-pill support-${app.supportStatus}`}>{app.supportLabel}</span><span className="pill">{app.type}</span></div></div></div>
      <div className={`support-summary support-summary-${app.supportStatus}`}><div><span>EasyOpen 지원 상태</span><strong>{app.supportLabel}</strong></div><p>{app.supportDescription}</p></div>
      <div className="jellyfin-source-row"><span>원본과 라이선스</span><a href={app.source} target="_blank" rel="noreferrer noopener">GitHub 소스 ↗</a><a href={app.licenseUrl} target="_blank" rel="noreferrer noopener">라이선스 ↗</a></div>
    </section>
    <JellyfinUsageGuide/>
  </>;
}
