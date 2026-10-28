import type {Metadata} from 'next';
import JellyfinUsageGuide from '@/components/JellyfinUsageGuide';
export const metadata:Metadata={title:'Jellyfin 사용 가이드',description:'EasyOpen에서 Jellyfin을 준비하고 연결할 때 필요한 플랫폼별 안내.'};
export default function JellyfinGuidePage(){return <JellyfinUsageGuide/>}
