'use client';
import {useMemo,useState} from 'react';
import Link from 'next/link';
import type {ProgramListing} from '@/lib/catalog';

export function SupportProgramCatalog({items}:{items:ProgramListing[]}){
 const [query,setQuery]=useState('');const [category,setCategory]=useState('전체');const showFilters=items.length>1;
 const categories=useMemo(()=>[...new Set(items.map(item=>item.category))],[items]);
 const visible=useMemo(()=>{const term=query.trim().toLocaleLowerCase('ko-KR');return items.filter(item=>(category==='전체'||item.category===category)&&(!term||[item.name,item.summary,item.category].join(' ').toLocaleLowerCase('ko-KR').includes(term)))},[items,query,category]);
 return <>{showFilters&&<div className="support-catalog-filters"><label className="search-field"><span className="sr-only">지원 프로그램 검색</span><input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="프로그램 검색"/></label><div className="chip-scroll" aria-label="카테고리 필터">{['전체',...categories].map(value=><button type="button" className={`filter-chip ${category===value?'active':''}`} aria-pressed={category===value} onClick={()=>setCategory(value)} key={value}>{value}</button>)}</div></div>}<div className="support-program-list">{visible.map(item=><Link className="support-program-card" href={`/apps/${item.slug}/`} aria-label={`${item.name} 상세 보기`} key={item.slug}><span className="app-icon" aria-hidden="true">{item.icon}</span><div className="support-program-copy"><div className="support-program-meta"><span>{item.category}</span><span className={`support-pill support-${item.easyOpenSupport.status}`}>{item.easyOpenSupport.label}</span></div><h2>{item.name}</h2><p>{item.summary}</p></div><span className="support-program-link">상세 보기 <span aria-hidden="true">→</span></span></Link>)}</div></>;
}
