import type { Metadata } from 'next';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import './globals.css';
import './downloads.css';
const base=process.env.NEXT_PUBLIC_SITE_URL || 'https://easyopen-web.pages.dev';
export const metadata:Metadata={metadataBase:new URL(base),title:{default:'EasyOpen | 무료 오픈소스를 더 쉽게',template:'%s | EasyOpen'},description:'개발 지식이 없어도 이해할 수 있는 한국어 오픈소스 프로그램 소개·설치 안내·사용 가이드.',openGraph:{type:'website',locale:'ko_KR',siteName:'EasyOpen',title:'EasyOpen — 좋은 소프트웨어를 더 쉽게',description:'무료 오픈소스 프로그램을 발견하고 공식 다운로드와 한국어 가이드를 확인하세요.'}};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="ko"><body><Header/><main>{children}</main><Footer/></body></html>}
