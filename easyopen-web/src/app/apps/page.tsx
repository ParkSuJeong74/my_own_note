import type { Metadata } from 'next';
import { Catalog } from '@/components/Catalog';
import { apps, categories } from '@/lib/catalog';
export const metadata:Metadata={title:'프로그램 찾기',description:'카테고리, 이름, 운영체제로 무료 오픈소스 프로그램을 검색하세요.'};
export default function AppsPage(){return <section className="shell page-section"><span className="section-kicker">APP DIRECTORY</span><h1 className="page-title">필요한 프로그램을 찾아보세요.</h1><p className="page-desc">무료로 시작할 수 있는 오픈소스 프로그램과 공식 배포처를 정리했어요.</p><Catalog items={apps} categories={categories}/></section>}
