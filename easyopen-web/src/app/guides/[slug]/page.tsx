import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apps, getApp } from '@/lib/catalog';
export function generateStaticParams(){return apps.map(a=>({slug:a.slug}));}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{const {slug}=await params;return {title:`${getApp(slug)?.name??'프로그램'} 시작 가이드`};}
export default async function Guide({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const app=getApp(slug);if(!app)notFound();return <section className="shell page-section article-narrow"><div className="breadcrumb"><Link href="/guides/">사용 가이드</Link><span>›</span>{app.name}</div><span className="section-kicker">QUICK START GUIDE</span><h1 className="page-title">{app.name}, 처음 시작하기</h1><p className="page-desc">{app.summary}</p><div className="content-panel"><div className="warning-note"><b>공식 자료를 우선 확인하세요</b><p>아래 내용은 첫 사용을 위한 간단한 안내이며, 실제 설치 조건과 최신 버전은 원본 개발자 문서가 기준입니다.</p></div><ol className="guide-steps">{app.steps.map((s,i)=><li key={s}><b>{String(i+1).padStart(2,'0')}</b><span>{s}</span></li>)}</ol><a href={app.official} className="btn btn-primary" target="_blank" rel="noopener noreferrer">공식 안내 열기 ↗</a><Link href={`/apps/${app.slug}/`} className="btn btn-outline">프로그램 정보 보기</Link></div></section>}
