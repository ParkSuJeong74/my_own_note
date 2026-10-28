import type { Metadata } from 'next';
import Link from 'next/link';
import { getApp } from '@/lib/catalog';
import { getProgramDetail } from '@/data/program-details';

export const metadata:Metadata={title:'지원 도구',description:'EasyOpen에서 가장 먼저 통합 테스트하고 있는 Jellyfin을 소개합니다.'};

export default function AppsPage(){
 const app=getApp('jellyfin');const detail=getProgramDetail('jellyfin');
 if(!app||!detail)return null;
 return <section className="shell page-section apps-focus-page"><span className="section-kicker">SUPPORTED TOOL</span><h1 className="page-title">하나씩,<br/>제대로 준비하고 있어요.</h1><p className="page-desc">EasyOpen은 Jellyfin부터 차근차근 통합 테스트하고 있습니다. 아직 정식 지원 단계는 아니며, 확인된 범위만 안내합니다.</p><article className="single-app-card"><div className="single-app-heading"><span className="app-icon" aria-hidden="true">{app.icon}</span><div><span className="support-pill support-integration-testing">테스트 중</span><h2>{app.name}</h2><p>{app.summary}</p></div></div><div className="single-app-features"><h3>Jellyfin으로 할 수 있는 일</h3><ul>{detail.features.slice(0,3).map(feature=><li key={feature.title}><strong>{feature.title}</strong><span>{feature.description}</span></li>)}</ul></div><div className="single-app-actions"><a className="btn btn-outline" href={detail.links[0].href} target="_blank" rel="noreferrer noopener">공식 출처 보기 <span aria-hidden="true">↗</span></a><Link className="btn btn-primary" href="/apps/jellyfin/">Jellyfin 자세히 보기 <span aria-hidden="true">→</span></Link></div></article><p className="apps-coming-note">더 많은 오픈소스 프로그램도 순차적으로 지원할 예정입니다.</p></section>
}
