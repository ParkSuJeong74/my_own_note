'use client';
import { useMemo, useState } from 'react';
import type { AppInfo } from '@/lib/catalog';
import { filterApps } from '@/lib/catalog';
import { AppCard } from './AppCard';
export function Catalog({items, categories, initialCategory='전체'}:{items:AppInfo[],categories:string[],initialCategory?:string}) {
 const [query,setQuery]=useState(''); const [category,setCategory]=useState(initialCategory); const [os,setOs]=useState('전체');
 const filtered=useMemo(()=>filterApps(items,query,category,os),[items,query,category,os]);
 return <><div className="filter-panel"><label className="search-field"><span className="search-symbol">⌕</span><span className="sr-only">프로그램 검색</span><input type="search" placeholder="프로그램 이름이나 하고 싶은 일을 검색하세요" value={query} onChange={e=>setQuery(e.target.value)}/></label><div className="filter-row"><div className="chip-scroll" aria-label="카테고리 필터">{['전체',...categories].map(c=><button key={c} type="button" className={`filter-chip ${category===c?'active':''}`} onClick={()=>setCategory(c)} aria-pressed={category===c}>{c}</button>)}</div><label className="os-select"><span className="sr-only">운영체제</span><select value={os} onChange={e=>setOs(e.target.value)}><option>전체</option><option>Windows</option><option>macOS</option><option>Linux</option></select></label></div></div><div className="results-meta"><strong>{filtered.length}개의 프로그램</strong><span>다운로드는 공식 배포처에서 진행됩니다.</span></div>{filtered.length?<div className="cards-grid">{filtered.map(a=><AppCard key={a.slug} app={a}/>)}</div>:<div className="empty-state"><strong>검색 결과가 없어요</strong><p>다른 검색어를 입력하거나 필터를 변경해 보세요.</p><button className="btn btn-dark" onClick={()=>{setQuery('');setCategory('전체');setOs('전체')}}>필터 초기화</button></div>}</>;
}
