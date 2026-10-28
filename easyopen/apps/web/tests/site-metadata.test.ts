import assert from 'node:assert/strict';
import test from 'node:test';

import { buildSiteMetadata, DEFAULT_SITE_URL } from '../src/lib/site-metadata';

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

test('배포 환경 주소를 지정하면 canonical 이미지도 같은 origin을 사용', () => {
  const metadata = buildSiteMetadata('https://preview.example.com/base/');
  const images = metadata.openGraph?.images;

  assert.equal(metadata.metadataBase?.toString(), 'https://preview.example.com/base/');
  assert.ok(Array.isArray(images));
  assert.equal(images[0]?.url.toString(), 'https://preview.example.com/assets/og.png');
});
