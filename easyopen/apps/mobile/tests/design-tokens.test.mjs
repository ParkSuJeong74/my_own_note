import assert from 'node:assert/strict';
import test from 'node:test';
import {easyOpenTheme} from '@easyopen/design-tokens';

test('모바일은 공통 EasyOpen 브랜드 토큰을 사용',()=>{
  assert.equal(easyOpenTheme.color.primary,'#7258df');
  assert.equal(easyOpenTheme.color.canvas,'#f7f6fb');
  assert.equal(easyOpenTheme.radius.lg,18);
});

test('확대 글자는 기본 버튼과 하단 메뉴의 고정 높이에 잘리지 않는다',async()=>{
  const {readFileSync}=await import('node:fs');
  const ts=await import('typescript');
  const source=readFileSync(new URL('../src/ui/styles.ts',import.meta.url),'utf8');
  const javascript=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  const exports={};
  const require=name=>{
    if(name==='react-native')return {StyleSheet:{create:styles=>styles}};
    if(name==='@easyopen/design-tokens')return {easyOpenTheme};
    throw new Error('Unexpected dependency: '+name);
  };
  new Function('require','exports',javascript)(require,exports);
  const {styles}=exports;
  for(const name of ['primaryButton','secondaryButton','serverInput','smallButton','closeButton','chip','heroCta','workspaceLink','sectionAction']){
    assert.ok(styles[name].minHeight>=44,name+' touch target');
    assert.equal(styles[name].height,undefined,name+' can grow with text');
  }
  assert.equal(styles.bottomNav.height,undefined);
  assert.ok(styles.bottomNav.minHeight>=76);
  assert.equal(styles.modalHeader.height,undefined);
});
