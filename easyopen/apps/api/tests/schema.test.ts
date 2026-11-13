import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import test from 'node:test';
const schema=readFileSync(new URL('../db/001-initial.sql',import.meta.url),'utf8');
test('EasyOpen DB는 회원·구독·권한·결제 이벤트·감사를 별도 테이블로 관리',()=>{for(const table of ['easyopen_users','easyopen_subscriptions','easyopen_entitlements','easyopen_payment_events','easyopen_audit_events'])assert.match(schema,new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));assert.doesNotMatch(schema,/mano_users|mano_admin/i);});
test('결제 이벤트와 entitlement source는 중복 처리를 막는다',()=>{assert.match(schema,/UNIQUE\(provider,provider_event_id\)/);assert.match(schema,/UNIQUE\(user_id,entitlement_key,source_type,source_id\)/);});
