import type {Metadata} from 'next';
import {StatsPanel} from '@/components/StatsPanel';
import '../stats.css';

export const metadata:Metadata={title:'운영 통계',description:'EasyOpen 방문 및 앱 다운로드 운영 통계.',robots:{index:false,follow:false}};

export default function StatsPage(){
 const analyticsEnabled=Boolean(process.env.NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN?.trim());
 return <section className="page-section stats-page"><div className="shell"><span className="section-kicker">EASYOPEN METRICS</span><h1 className="page-title">운영 통계</h1><p className="page-desc">사이트 방문 현황과 공개 베타 다운로드를 서로 다른 지표로 확인합니다.</p><StatsPanel analyticsEnabled={analyticsEnabled}/></div></section>;
}
