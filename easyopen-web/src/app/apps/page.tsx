import type { Metadata } from 'next';
import { Catalog } from '@/components/Catalog';
import { apps, categories } from '@/lib/catalog';
export const metadata:Metadata={title:'지원 도구',description:'EasyOpen 통합 검증 대상과 후속 후보, 공식 정보만 제공하는 오픈소스를 구분해 확인하세요.'};
export default function AppsPage(){return <section className="shell page-section"><span className="section-kicker">SUPPORTED TOOLS</span><h1 className="page-title">EasyOpen의 지원 범위를<br/>먼저 확인하세요.</h1><p className="page-desc">모든 프로그램을 EasyOpen 안에서 실행할 수 있는 것은 아닙니다. 통합 검증 대상과 후속 후보, 공식 정보만 제공하는 도구를 명확히 나눕니다.</p><Catalog items={apps} categories={categories}/></section>}
