import test from 'node:test';import assert from 'node:assert/strict';import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';
import {WorkspaceOverview} from '../src/components/WorkspaceOverview.tsx';
import {ProgramRow} from '../src/components/ProgramCard.tsx';
const app={id:'jellyfin',name:'Jellyfin',summary:'내 미디어를 연결해 이용하세요.',category:'미디어',license:'GPL-2.0',os:['windows'],install:{},requirements:'PC',guide:'Guide',officialUrl:'https://github.com/jellyfin/jellyfin'};
const props={readyApp:undefined,managedCount:null,discoveredCount:0,runningTasks:0,onOpen(){},onDiscover(){},onTasks(){},onConnection(){}};
test('workspace does not invent installed or running programs before device results',()=>{
 const html=renderToStaticMarkup(React.createElement(WorkspaceOverview,props));assert.ok(html.includes('첫 프로그램을 준비해 볼까요?'));assert.ok(html.includes('기기 상태 확인 전'));assert.ok(!html.includes('Jellyfin'));assert.ok(!html.includes('실행 중'));
});
test('continue action uses the app supplied by verified runtime state',()=>{
 const html=renderToStaticMarkup(React.createElement(WorkspaceOverview,{...props,readyApp:app,managedCount:1,runningTasks:2}));assert.ok(html.includes('Jellyfin'));assert.ok(html.includes('2개 작업 진행 중'));assert.ok(html.includes('프로그램 열기'));
});
test('program card keeps contextual accessible actions and ownership information',()=>{
 const html=renderToStaticMarkup(React.createElement(ProgramRow,{app,state:'installed',connected:true,managed:false,nativeWindows:true,onDetails(){},onPrimary(){}}));assert.ok(html.includes('Jellyfin 상세 보기'));assert.ok(html.includes('Jellyfin 자세히 보기'));assert.ok(html.includes('이 PC에서 발견'));assert.ok(html.includes(app.summary));assert.ok(html.includes(app.license));
});
