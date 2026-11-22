import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import sitemap from '../src/app/sitemap';

const headers = readFileSync(new URL('../public/_headers', import.meta.url), 'utf8');
const redirects = readFileSync(new URL('../public/_redirects', import.meta.url), 'utf8');

test('공개 사이트 응답은 기본 브라우저 보안 경계를 선언', () => {
  for (const header of [
    'Content-Security-Policy:',
    'Cross-Origin-Opener-Policy: same-origin',
    'Permissions-Policy:',
    'Referrer-Policy: strict-origin-when-cross-origin',
    'Strict-Transport-Security:',
    'X-Content-Type-Options: nosniff',
    'X-Frame-Options: DENY',
  ]) {
    assert.match(headers, new RegExp(header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  assert.match(headers, /frame-ancestors 'none'/);
  assert.match(headers, /object-src 'none'/);
  assert.doesNotMatch(headers, /Access-Control-Allow-Origin:\s*\*/);
});

test('CSP는 현재 사이트가 실제 사용하는 외부 출처만 허용', () => {
  for (const origin of [
    'https://static.cloudflareinsights.com',
    'https://cloudflareinsights.com',
    'https://api.github.com',
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com',
  ]) {
    assert.match(headers, new RegExp(origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  const styleDirective=headers.match(/style-src[^;]+/)?.[0]??'';
  assert.doesNotMatch(styleDirective,/'unsafe-inline'/);
});

test('공개 경로는 홈·다운로드·최소 운영 안내만 색인',()=>{
 assert.deepEqual(sitemap().map(item=>new URL(item.url.toString()).pathname),['/','/download/','/legal/']);
 for(const removed of ['/about/*','/apps/*','/categories/*','/guides/*','/stats/*'])assert.match(redirects,new RegExp(removed.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
});

test('미리보기 주소는 색인하지 않고 해시된 Next 자산만 장기 캐시', () => {
  assert.match(headers, /https:\/\/:version\.:subdomain\.workers\.dev\/\*/);
  assert.match(headers, /X-Robots-Tag: noindex, nofollow/);
  assert.match(headers, /\/_next\/static\/\*/);
  assert.match(headers, /Cache-Control: public, max-age=31536000, immutable/);
});
