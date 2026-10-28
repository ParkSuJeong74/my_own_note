import type { Metadata } from 'next';
import {SupportProgramCatalog} from '@/components/SupportProgramCatalog';
import {apps,toProgramListing} from '@/lib/catalog';

export const metadata:Metadata={title:'지원 프로그램',description:'EasyOpen에서 만나볼 수 있는 프로그램과 현재 지원 상태를 확인하세요.'};

export default function AppsPage(){
 const publicPrograms=apps.filter(app=>app.slug==='jellyfin').map(toProgramListing);
 return <section className="shell page-section support-programs-page"><span className="section-kicker">SUPPORTED PROGRAMS</span><h1 className="page-title">지원 프로그램</h1><p className="page-desc">EasyOpen에서 만나볼 수 있는 프로그램을 확인해 보세요.</p><SupportProgramCatalog items={publicPrograms}/><p className="apps-coming-note">새로운 프로그램은 지원 준비가 되는 대로 추가됩니다.</p></section>
}
