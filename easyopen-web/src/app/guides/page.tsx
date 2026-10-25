import type { Metadata } from 'next';
import Link from 'next/link';
import { apps } from '@/lib/catalog';
export const metadata:Metadata={title:'한국어 사용 가이드'};
export default function Guides(){return <section className="shell page-section"><span className="section-kicker">GETTING STARTED</span><h1 className="page-title">처음 시작하는 분들을 위해.</h1><p className="page-desc">프로그램을 선택하고 공식 설치 및 첫 사용 순서를 확인하세요.</p><div className="guides-grid">{apps.map(a=><Link className="guide-row" href={`/guides/${a.slug}/`} key={a.slug}><span className="app-icon">{a.icon}</span><span><b>{a.name} 시작 가이드</b><small>{a.summary}</small></span><span className="guide-arrow">↗</span></Link>)}</div></section>}
