'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useState} from 'react';
import { Brand } from './Brand';
const links=[['/about/','제품 소개'],['/apps/','지원 도구']] as const;
export function Header() {const pathname=usePathname();const [open,setOpen]=useState(false);return <header className="site-header"><div className="shell header-inner"><Brand/><button className="menu-toggle" type="button" aria-expanded={open} aria-controls="site-nav" onClick={()=>setOpen(value=>!value)}><span className="sr-only">메뉴 {open?'닫기':'열기'}</span><span aria-hidden="true">{open?'×':'☰'}</span></button><nav id="site-nav" className={open?'nav-open':''} aria-label="주요 메뉴">{links.map(([href,label])=><Link key={href} href={href} aria-current={pathname.startsWith(href)?'page':undefined} onClick={()=>setOpen(false)}>{label}</Link>)}</nav></div></header>}
