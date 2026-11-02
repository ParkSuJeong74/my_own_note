import assert from 'node:assert/strict';
import test from 'node:test';
import {easyOpenTheme} from '@easyopen/design-tokens';

test('모바일은 공통 EasyOpen 브랜드 토큰을 사용',()=>{
  assert.equal(easyOpenTheme.color.primary,'#7960df');
  assert.equal(easyOpenTheme.color.canvas,'#f8f9fc');
  assert.equal(easyOpenTheme.radius.lg,15);
});
