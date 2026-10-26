import assert from 'node:assert/strict';
import test from 'node:test';
import {selectEasyOpenRelease} from '../src/lib/releases';

const release={tag_name:'easyopen-v0.1.0-beta.2',name:'EasyOpen beta',html_url:'https://github.com/ParkSuJeong74/my_own_note/releases/tag/easyopen-v0.1.0-beta.2',draft:false,prerelease:true,published_at:'2026-10-25T12:29:26Z',assets:[
 {name:'EasyOpen-0.1.0-Setup.exe',browser_download_url:'https://github.com/ParkSuJeong74/my_own_note/releases/download/easyopen-v0.1.0-beta.2/EasyOpen-0.1.0-Setup.exe',size:100,download_count:12},
 {name:'EasyOpen-Android-0.1.0-beta.2.apk',browser_download_url:'https://github.com/ParkSuJeong74/my_own_note/releases/download/easyopen-v0.1.0-beta.2/EasyOpen-Android-0.1.0-beta.2.apk',size:200,download_count:7},
 {name:'SHA256SUMS.txt',browser_download_url:'https://github.com/ParkSuJeong74/my_own_note/releases/download/easyopen-v0.1.0-beta.2/SHA256SUMS.txt',size:10,download_count:3},
]};
test('최신 EasyOpen prerelease 자산을 선택',()=>{const selected=selectEasyOpenRelease([release]);assert.equal(selected?.windows?.name,'EasyOpen-0.1.0-Setup.exe');assert.equal(selected?.android?.name,'EasyOpen-Android-0.1.0-beta.2.apk');assert.equal(selected?.checksums?.name,'SHA256SUMS.txt')});
test('draft·다른 저장소·정식이 아닌 태그는 거절',()=>{assert.equal(selectEasyOpenRelease([{...release,draft:true}]),null);assert.equal(selectEasyOpenRelease([{...release,html_url:'https://evil.example/release'}]),null);assert.equal(selectEasyOpenRelease([{...release,tag_name:'other-v1'}]),null)});
