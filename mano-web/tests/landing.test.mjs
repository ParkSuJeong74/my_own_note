import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const html=readFileSync(join(root,'index.html'),'utf8');
const css=readFileSync(join(root,'assets/style.css'),'utf8');
function tags(s){return [...html.matchAll(new RegExp(`<${s}\\b[^>]*>`, 'g'))].map(x=>x[0]);}
test('document branding, Korean, SEO and anchored sections',()=>{
 assert.match(html,/<html lang="ko">/);
 assert.match(html,/<title>MANO — 내가 쓰고 싶어서 만든 도구들<\/title>/);
 assert.match(html,/<link rel="canonical" href="https:\/\/mano.io.kr\/"/);
 for(const id of ['main','top','about','work','principles']) assert.match(html,new RegExp(`id="${id}"`));
 assert.ok(existsSync(join(root,'robots.txt')));
 assert.ok(existsSync(join(root,'sitemap.xml')));
});
test('EasyOpen links are real and opened safely',()=>{
 const links=tags('a').filter(a=>a.includes('href="https://easy-open.mano.io.kr/"'));
 assert.ok(links.length>=3,'expected visible paths to the live service');
 for(const link of links) {assert.match(link,/target="_blank"/);assert.match(link,/rel="noopener noreferrer"/);}
});
test('no empty links, fake product checkout or invented launches',()=>{
 for(const tag of tags('a')){assert.doesNotMatch(tag,/href="#"/);assert.doesNotMatch(tag,/href=""/);assert.doesNotMatch(tag,/href="javascript:/);}
 assert.match(html,/연구 중/);
 assert.match(html,/구상 중/);
 assert.match(html,/별도 다운로드나 유료 판매는 아직 제공하지 않습니다/);
 assert.doesNotMatch(html,/구매하기|결제하기|지금 다운로드/);
});
test('all local assets and navigation anchors resolve',()=>{
 for(const m of html.matchAll(/(?:src|href)="(\/[^"]+)"/g)) assert.ok(existsSync(join(root,m[1].slice(1))),`missing asset ${m[1]}`);
 for(const m of html.matchAll(/href="#([a-z0-9-]+)"/g)) assert.match(html,new RegExp(`id="${m[1]}"`),`missing anchor ${m[1]}`);
});
test('keyboard accessibility and responsive layout',()=>{
 assert.match(html,/class="skip-link"/);assert.match(html,/aria-label="모바일 메뉴"/);
 assert.match(css,/@media\(max-width:720px\)/);
 assert.match(css, /prefers-reduced-motion/);
 assert.match(css, /focus-visible/);
});
