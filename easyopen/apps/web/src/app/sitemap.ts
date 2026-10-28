import type { MetadataRoute } from 'next';
import { categoryDetails } from '@/lib/catalog';
const base=process.env.NEXT_PUBLIC_SITE_URL || 'https://easy-open.mano.io.kr';
export const dynamic = 'force-static';
export default function sitemap():MetadataRoute.Sitemap {return ['','/apps','/about','/download','/legal','/apps/jellyfin','/guides/jellyfin',...categoryDetails.map(category=>`/categories/${category.slug}`)].map(path=>({url:`${base}${path || '/'}`,changeFrequency:'monthly' as const,priority:path===''?1:.6}));}
