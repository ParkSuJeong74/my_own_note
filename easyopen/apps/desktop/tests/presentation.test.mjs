import assert from 'node:assert/strict';
import test from 'node:test';
import {mergePresentation} from '../src/presentation.ts';
const app={id:'jellyfin',name:'Jellyfin',summary:'Bundled',category:'Media',requirements:'PC',guide:'Guide',os:['windows'],officialUrl:'https://github.com/jellyfin/jellyfin',sourceUrl:'https://github.com/jellyfin/jellyfin',license:'GPL',install:{windows:{method:'managed-server',validated:false}}};
test('remote content updates display text but cannot grant execution capabilities',()=>{
 const [merged]=mergePresentation([app],[{...app,summary:'Updated',os:['macos'],officialUrl:'https://evil.invalid',install:{windows:{method:'shell',validated:true}}}]);
 assert.equal(merged.summary,'Updated');
 assert.equal(merged.install,app.install);
 assert.equal(merged.os,app.os);
 assert.equal(merged.officialUrl,app.officialUrl);
});
test('unknown programs are not promoted to native install targets',()=>{
 assert.deepEqual(mergePresentation([app],[{...app,id:'unknown'}]),[app]);
});
test('malformed metadata is rejected and missing entries preserve bundled data',()=>{
 assert.deepEqual(mergePresentation([app],[]),[app]);
 assert.throws(()=>mergePresentation([app],[app,app]));
 assert.throws(()=>mergePresentation([app],[{...app,summary:3}]));
 assert.throws(()=>mergePresentation([app],null));
});
