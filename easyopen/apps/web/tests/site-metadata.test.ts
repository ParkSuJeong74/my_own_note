import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildSiteMetadata,
  buildPageMetadata,
  buildSiteVerification,
  DEFAULT_SITE_URL,
} from '../src/lib/site-metadata';

test('공유 메타데이터는 EasyOpen 운영 주소와 1200×630 이미지를 사용', () => {
  const metadata = buildSiteMetadata();
  const image = metadata.openGraph?.images;

  assert.equal(metadata.metadataBase?.toString(), `${DEFAULT_SITE_URL}/`);
  assert.equal(metadata.openGraph?.url, '/');
  assert.ok(Array.isArray(image));
  assert.equal(image[0]?.url.toString(), `${DEFAULT_SITE_URL}/assets/og.png`);
  assert.equal(image[0]?.width, 1200);
  assert.equal(image[0]?.height, 630);
  assert.equal(metadata.twitter?.card, 'summary_large_image');
  assert.deepEqual(metadata.twitter?.images, [new URL(`${DEFAULT_SITE_URL}/assets/og.png`)]);
});

test('하위 페이지는 홈이 아니라 자기 경로를 canonical과 공유 URL로 사용',()=>{
  const metadata=buildPageMetadata({path:'/download',title:'EasyOpen 다운로드',description:'다운로드 설명'});
  assert.equal(metadata.alternates?.canonical,'/download/');
  assert.equal(metadata.openGraph?.url,'/download/');
  assert.equal(metadata.openGraph?.title,'EasyOpen 다운로드 | EasyOpen');
  assert.equal(metadata.description,'다운로드 설명');
});

test('배포 환경 주소를 지정하면 canonical 이미지도 같은 origin을 사용', () => {
  const metadata = buildSiteMetadata('https://preview.example.com/base/');
  const images = metadata.openGraph?.images;

  assert.equal(metadata.metadataBase?.toString(), 'https://preview.example.com/base/');
  assert.ok(Array.isArray(images));
  assert.equal(images[0]?.url.toString(), 'https://preview.example.com/assets/og.png');
});

test('검색엔진 소유권 검증값은 설정된 공개 값만 공백을 제거해 출력', () => {
  const verification = buildSiteVerification({
    NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION: ' google-token ',
    NEXT_PUBLIC_NAVER_SITE_VERIFICATION: 'naver-token',
    NEXT_PUBLIC_BING_SITE_VERIFICATION: '   ',
  });

  assert.deepEqual(verification, {
    google: 'google-token',
    other: { 'naver-site-verification': 'naver-token' },
  });
  assert.deepEqual(buildSiteMetadata(DEFAULT_SITE_URL, verification).verification, verification);
});

test('검색엔진 검증값이 없으면 빈 verification 메타데이터를 만들지 않음', () => {
  assert.equal(
    buildSiteVerification({
      NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION: '',
      NEXT_PUBLIC_NAVER_SITE_VERIFICATION: ' ',
    }),
    undefined,
  );
});
