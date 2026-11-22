import type { Metadata } from 'next';

export const DEFAULT_SITE_URL = 'https://easy-open.mano.io.kr';
export const DEFAULT_DESCRIPTION = '오픈소스 소프트웨어 발견부터 설치, 실행, 업데이트, 관리까지.';

type PublicVerificationEnvironment = Record<string, string | undefined> & {
  NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?: string;
  NEXT_PUBLIC_NAVER_SITE_VERIFICATION?: string;
  NEXT_PUBLIC_BING_SITE_VERIFICATION?: string;
};

function optionalValue(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

export function buildSiteVerification(
  environment: PublicVerificationEnvironment = process.env,
): Metadata['verification'] | undefined {
  const google = optionalValue(environment.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION);
  const naver = optionalValue(environment.NEXT_PUBLIC_NAVER_SITE_VERIFICATION);
  const bing = optionalValue(environment.NEXT_PUBLIC_BING_SITE_VERIFICATION);
  const other = {
    ...(naver ? { 'naver-site-verification': naver } : {}),
    ...(bing ? { 'msvalidate.01': bing } : {}),
  };

  if (!google && Object.keys(other).length === 0) return undefined;
  return {
    ...(google ? { google } : {}),
    ...(Object.keys(other).length > 0 ? { other } : {}),
  };
}

export function buildSiteMetadata(
  siteUrl = DEFAULT_SITE_URL,
  verification = buildSiteVerification(),
): Metadata {
  const base = new URL(siteUrl);
  const image = new URL('/assets/og.png', base);
  const title = 'EasyOpen — 좋은 오픈소스 소프트웨어를 누구나 쉽게';
  const description = DEFAULT_DESCRIPTION;

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
    ...(verification ? { verification } : {}),
  };
}

export function buildPageMetadata({path,title,description=DEFAULT_DESCRIPTION}:{path:string;title:string;description?:string}):Metadata {
  const canonical=path==='/'?'/':`/${path.replace(/^\/+|\/+$/g,'')}/`;
  const socialTitle=`${title} | EasyOpen`;
  return {
    title,
    description,
    alternates:{canonical},
    openGraph:{type:'website',locale:'ko_KR',siteName:'EasyOpen',title:socialTitle,description,url:canonical,images:[{url:'/assets/og.png',width:1200,height:630,alt:socialTitle}]},
    twitter:{card:'summary_large_image',title:socialTitle,description,images:['/assets/og.png']},
  };
}
