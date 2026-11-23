import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import test from 'node:test';
test('Next web has no direct database or OAuth credentials dependency',()=>{
 const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
 assert.equal(pkg.dependencies.pg,undefined);assert.equal(pkg.dependencies.typeorm,undefined);assert.equal(pkg.dependencies.jose,undefined);
 const auth=readFileSync(new URL('../src/lib/request-auth.ts',import.meta.url),'utf8');assert.ok(auth.includes("backendRequest('/v1/me')"));
});
test('web forwards only fixed account routes to the internal backend',()=>{
 const config=readFileSync(new URL('../next.config.ts',import.meta.url),'utf8');for(const path of ['/v1/:path*','/api/health','/workspace/connect/approve','/workspace/logout','/admin/logout'])assert.ok(config.includes(path));assert.ok(config.includes('beforeFiles'));
});
