import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {easyOpenTheme} from '@easyopen/design-tokens';

test('공통 디자인 토큰의 JS와 CSS primary 값이 일치하고 흰 글자 대비를 확보',()=>{
  const css=readFileSync(new URL('../node_modules/@easyopen/design-tokens/theme.css',import.meta.url),'utf8');
  assert.match(css,new RegExp(`--eo-primary:\\s*${easyOpenTheme.color.primary}`,'i'));
  assert.ok(contrast(easyOpenTheme.color.primary,'#ffffff')>=4.5);
});

function contrast(left,right){
  const a=luminance(left);const b=luminance(right);
  return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
}

function luminance(hex){
  const values=hex.slice(1).match(/.{2}/g).map(value=>Number.parseInt(value,16)/255);
  const [r,g,b]=values.map(value=>value<=.03928?value/12.92:((value+.055)/1.055)**2.4);
  return .2126*r+.7152*g+.0722*b;
}
