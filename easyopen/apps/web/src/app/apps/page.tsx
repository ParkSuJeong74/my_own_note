import type { Metadata } from 'next';
import { Catalog } from '@/components/Catalog';
import { apps, categories } from '@/lib/catalog';
export const metadata:Metadata={title:'지원 도구',description:'EasyOpen 통합 검증 대상과 후속 후보, 공식 정보만 제공하는 오픈소스를 구분해 확인하세요.'};
export default function AppsPage(){return <section className="shell page-section"><span className="section-kicker">SUPPORTED TOOLS</span><h1 className="page-title">지금 사용할 도구를<br/>찾아보세요.</h1><p className="page-desc">현재 선택할 수 있는 도구는 Jellyfin입니다. 나머지는 검색할 수 있지만 Jellyfin 실기기 검증이 끝날 때까지 비활성화됩니다.</p><Catalog items={apps} categories={categories}/></section>}
