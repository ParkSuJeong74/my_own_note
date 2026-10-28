import assert from 'node:assert/strict';
import test from 'node:test';
import {safeChannelUrl} from '../src/lib/distribution';

test('각 배포 채널의 공식 HTTPS 호스트만 허용',()=>{
 assert.equal(safeChannelUrl('microsoftStore','https://apps.microsoft.com/detail/example'),'https://apps.microsoft.com/detail/example');
 assert.equal(safeChannelUrl('homebrew','https://formulae.brew.sh/cask/easyopen'),'https://formulae.brew.sh/cask/easyopen');
 assert.equal(safeChannelUrl('googlePlay','https://play.google.com/store/apps/details?id=kr.io.mano.easyopen'),'https://play.google.com/store/apps/details?id=kr.io.mano.easyopen');
 assert.equal(safeChannelUrl('testFlight','https://testflight.apple.com/join/example'),'https://testflight.apple.com/join/example');
});

test('미설정·HTTP·다른 호스트 URL은 활성화하지 않음',()=>{
 assert.equal(safeChannelUrl('googlePlay',undefined),null);
 assert.equal(safeChannelUrl('googlePlay','http://play.google.com/store/apps/details?id=x'),null);
 assert.equal(safeChannelUrl('testFlight','https://example.com/join/x'),null);
});
