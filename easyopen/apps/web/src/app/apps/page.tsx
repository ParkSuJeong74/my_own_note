import type { Metadata } from 'next';
import { Catalog } from '@/components/Catalog';
import { apps, categories } from '@/lib/catalog';
export const metadata:Metadata={title:'지원 도구',description:'EasyOpen 통합 검증 대상과 후속 후보, 공식 정보만 제공하는 오픈소스를 구분해 확인하세요.'};
export default function AppsPage(){return <section className="shell page-section"><span className="section-kicker">SUPPORTED TOOLS</span><h1 className="page-title">지원 도구와<br/>준비 중인 도구를 확인하세요.</h1><p className="page-desc">Jellyfin은 첫 통합 검증 대상입니다. 실제 사용 가능 여부는 기기와 배포 상태에 따라 달라질 수 있습니다. 그 외 도구는 지원 예정이며 현재 EasyOpen에서 실행할 수 없습니다.</p><Catalog items={apps} categories={categories}/></section>}
