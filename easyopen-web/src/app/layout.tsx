import type { Metadata } from 'next';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CloudflareAnalytics } from '@/components/CloudflareAnalytics';
import { buildSiteMetadata } from '@/lib/site-metadata';
import './globals.css';
import './downloads.css';
const base=process.env.NEXT_PUBLIC_SITE_URL || 'https://easy-open.mano.io.kr';
export const metadata:Metadata=buildSiteMetadata(base);
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="ko"><body><Header/><main>{children}</main><Footer/><CloudflareAnalytics/></body></html>}
