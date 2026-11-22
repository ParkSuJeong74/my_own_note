import type {Metadata} from 'next';
import JellyfinUsageGuide from '@/components/JellyfinUsageGuide';
import {buildPageMetadata} from '@/lib/site-metadata';
export const metadata:Metadata=buildPageMetadata({path:'/guides/jellyfin/',title:'Jellyfin 사용 가이드',description:'EasyOpen에서 Jellyfin을 준비하고 연결할 때 필요한 플랫폼별 안내.'});
export default function JellyfinGuidePage(){return <JellyfinUsageGuide/>}
