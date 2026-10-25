import type { MetadataRoute } from 'next';
const base=process.env.NEXT_PUBLIC_SITE_URL || 'https://easyopen-web.pages.dev';
export const dynamic = 'force-static';
export default function robots():MetadataRoute.Robots {return {rules:[{userAgent:'*',allow:'/'}],sitemap:`${base}/sitemap.xml`};}
