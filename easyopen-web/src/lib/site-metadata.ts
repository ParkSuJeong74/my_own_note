import type { Metadata } from 'next';

export const DEFAULT_SITE_URL = 'https://easy-open.mano.io.kr';

export function buildSiteMetadata(siteUrl = DEFAULT_SITE_URL): Metadata {
  const base = new URL(siteUrl);
  const image = new URL('/assets/og.png', base);
  const title = 'EasyOpen — 좋은 오픈소스 소프트웨어를 누구나 쉽게';
  const description = '오픈소스 소프트웨어 발견부터 설치, 실행, 업데이트, 관리까지.';

  return {
    metadataBase: base,
    title: {
      default: 'EasyOpen | 무료 오픈소스를 더 쉽게',
      template: '%s | EasyOpen',
    },
    description,
    alternates: { canonical: '/' },
    openGraph: {
      type: 'website',
      locale: 'ko_KR',
      siteName: 'EasyOpen',
      title,
      description,
      url: '/',
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}
