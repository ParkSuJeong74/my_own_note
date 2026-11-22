import type { MetadataRoute } from 'next';
import { categoryDetails } from '@/lib/catalog';
import {apps} from '@/lib/catalog';
import {getProgramDetail,publishedProgramSlugs} from '@/data/program-details';
const base=process.env.NEXT_PUBLIC_SITE_URL || 'https://easy-open.mano.io.kr';
export const dynamic = 'force-static';
export default function sitemap():MetadataRoute.Sitemap {const publicCategories=categoryDetails.filter(category=>apps.some(app=>app.category===category.name&&Boolean(getProgramDetail(app.slug))));const paths=['','/apps','/categories','/about','/download','/legal',...publishedProgramSlugs.map(slug=>`/apps/${slug}`),'/guides/jellyfin',...publicCategories.map(category=>`/categories/${category.slug}`)];return paths.map(path=>({url:`${base}${path || '/'}`,changeFrequency:'monthly' as const,priority:path===''?1:.6}));}
