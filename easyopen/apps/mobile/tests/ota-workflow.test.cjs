const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
test('OTA publish is explicit, production-only and checked before upload',()=>{
  const workflow=readFileSync('../../../.github/workflows/easyopen-mobile-ota.yml','utf8');
  assert.match(workflow,/workflow_dispatch:/);
  assert.doesNotMatch(workflow,/\n  push:/);
  assert.match(workflow,/github.ref == 'refs\/heads\/master'/);
  assert.match(workflow,/permissions:\n  contents: read/);
  assert.match(workflow,/test -n "\$EXPO_TOKEN"/);
  assert.ok(workflow.indexOf('npm run typecheck')<workflow.indexOf('update --channel production'));
  assert.match(workflow,/eas-cli@27\.11\.0/);
});
