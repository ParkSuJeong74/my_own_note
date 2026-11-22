import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {ProgramDetailPage} from '@/components/ProgramDetailPage';
import {getProgramDetail} from '@/data/program-details';
import {buildPageMetadata} from '@/lib/site-metadata';
export function generateStaticParams(){return [{slug:'jellyfin'}]}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{const {slug}=await params;const program=getProgramDetail(slug);return buildPageMetadata({path:`/apps/${slug}/`,title:program?.name??'지원 도구',description:program?.tagline})}
export default async function AppPage({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const program=getProgramDetail(slug);if(!program)notFound();return <ProgramDetailPage program={program}/>}
