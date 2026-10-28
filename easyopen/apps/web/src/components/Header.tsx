import Link from 'next/link';
import { Brand } from './Brand';
export function Header() {return <header className="site-header"><div className="shell header-inner"><Brand/><nav aria-label="주요 메뉴"><Link href="/about/">제품 소개</Link><Link href="/apps/">지원 도구</Link><Link href="/download/">다운로드</Link></nav><Link className="header-cta" href="/download/">다운로드 <span aria-hidden="true">↓</span></Link></div></header>}
