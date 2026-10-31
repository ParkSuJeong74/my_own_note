import type { Metadata } from 'next';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CloudflareAnalytics } from '@/components/CloudflareAnalytics';
import { ScrollToTopButton } from '@/components/ScrollToTopButton';
import { buildSiteMetadata } from '@/lib/site-metadata';
import './globals.css';
import './downloads.css';
const base=process.env.NEXT_PUBLIC_SITE_URL || 'https://easy-open.mano.io.kr';
export const metadata:Metadata=buildSiteMetadata(base);
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="ko"><body><Header/><main>{children}</main><Footer/><ScrollToTopButton/><CloudflareAnalytics/></body></html>}
