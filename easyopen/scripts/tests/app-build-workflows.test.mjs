import assert from 'node:assert/strict';
import test from 'node:test';
import {createRequire} from 'node:module';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const require=createRequire(new URL('../../apps/desktop/package.json',import.meta.url));
const yaml=require('js-yaml');
const app=yaml.load(await readFile(new URL('../../../.github/workflows/easyopen-desktop-release.yml',import.meta.url),'utf8'));
const ios=yaml.load(await readFile(new URL('../../../.github/workflows/easyopen-ios-test.yml',import.meta.url),'utf8'));
function enabled(expression,event,scope='',publish=false,results={}){
 const needs=Object.fromEntries(['release-metadata','package-windows','package-macos','package-android','prepare-release-assets','build'].map(name=>[name,{result:'success'}]));
 for(const [name,result] of Object.entries(results))needs[name]={result};
 const code=expression.replace(/^\s*\$\{\{\s*|\s*\}\}\s*$/g,'').replace(/needs\.([a-zA-Z0-9_-]+)/g,(_,name)=>'needs['+JSON.stringify(name)+']');
 return Boolean(vm.runInNewContext(code,{github:{event_name:event,ref:'refs/heads/master'},inputs:{release_scope:scope,publish},needs,always:()=>true},{timeout:1000}));
}
test('push creates Windows/macOS/Android plus the separate unsigned iOS build',()=>{
 for(const name of ['package-windows','package-macos','package-android'])assert.equal(enabled(app.jobs[name].if,'push'),true,name);
 for(const workflow of [app,ios]){
  assert.deepEqual(workflow.on.push.branches,['master']);
  assert.ok(workflow.on.push.paths.includes('.gitattributes'));
  for(const path of ['easyopen/apps/desktop/**','easyopen/apps/mobile/**','easyopen/apps/catalog/**','easyopen/packages/**'])assert.ok(workflow.on.push.paths.includes(path));
  assert.equal(workflow.permissions.contents,'read');
 }
 assert.equal(enabled(app.jobs['create-prerelease'].if,'push'),false);
 assert.equal(enabled(ios.jobs.publish.if,'push'),false);
});
test('push cannot load signing secrets or publish; unsigned metadata is removed',()=>{
 for(const platform of ['windows','android','macos']){
  const job=app.jobs['package-'+platform];
  for(const step of job.steps.filter(step=>/Doppler|signing secrets|release secrets/.test(step.name||'')))assert.equal(enabled(step.if,'push'),false,step.name);
 }
 for(const platform of ['windows','macos']){
  const step=app.jobs['package-'+platform].steps.find(step=>/^Remove .* update metadata/.test(step.name||''));assert.equal(enabled(step.if,'push'),true);
 }
});
test('candidate requires every selected platform, including automatic builds',()=>{
 const condition=app.jobs['prepare-release-assets'].if;
 assert.equal(enabled(condition,'push'),true);
 for(const platform of ['windows','macos','android'])for(const result of ['failure','cancelled','skipped'])assert.equal(enabled(condition,'push','',false,{['package-'+platform]:result}),false);
 assert.equal(enabled(condition,'workflow_dispatch','macos',false,{'package-windows':'skipped','package-android':'skipped'}),true);
 assert.equal(enabled(condition,'workflow_dispatch','android',false,{'package-windows':'skipped','package-macos':'skipped'}),true);
 for(const scope of ['all','test-all','android','macos']){
  assert.equal(enabled(condition,'workflow_dispatch',scope),true);
  const selected=scope==='android'?['android']:scope==='macos'?['macos']:['windows','macos','android'];
  for(const platform of selected)assert.equal(enabled(condition,'workflow_dispatch',scope,false,{['package-'+platform]:'failure'}),false);
  for(const platform of ['windows','macos','android'])assert.equal(enabled(app.jobs['package-'+platform].if,'workflow_dispatch',scope),selected.includes(platform));
 }
});
test('publishing remains explicit and requires successful preparation',()=>{
 const condition=app.jobs['create-prerelease'].if;
 assert.equal(enabled(condition,'workflow_dispatch','all',false),false);
 assert.equal(enabled(condition,'workflow_dispatch','all',true),true);
 assert.equal(enabled(condition,'workflow_dispatch','all',true,{'prepare-release-assets':'failure'}),false);
});
test('build evidence identifies the commit and run without secrets',async()=>{
 const output=await mkdtemp(join(tmpdir(),'easyopen-build-evidence-'));
 try{
  for(const platform of ['windows','macos','android','ios']){
   execFileSync(process.execPath,[fileURLToPath(new URL('../write-build-info.mjs',import.meta.url)),platform,output],{env:{...process.env,GITHUB_SHA:'a'.repeat(40),GITHUB_EVENT_NAME:'push',GITHUB_REPOSITORY:'example/repo',GITHUB_RUN_ID:'123',GITHUB_SERVER_URL:'https://github.com'}});
   const info=JSON.parse(await readFile(join(output,'BUILD-INFO-'+platform+'.json'),'utf8'));assert.equal(info.commit,'a'.repeat(40));assert.equal(info.platform,platform);assert.equal(info.runUrl,'https://github.com/example/repo/actions/runs/123');assert.equal(info.event,'push');
  }
 }finally{await rm(output,{recursive:true,force:true});}
});

test('Windows checkout preserves exact generated CSS through LF attributes',async()=>{
 const attrs=await readFile(new URL('../../../.gitattributes',import.meta.url),'utf8');
 assert.match(attrs,/^easyopen\/\*\* text=auto eol=lf$/m);
 assert.match(attrs,/^\.github\/\*\* text=auto eol=lf$/m);
});
