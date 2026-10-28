import Link from 'next/link';
import { Brand } from './Brand';
export function Header() {return <header className="site-header"><div className="shell header-inner"><Brand/><nav aria-label="주요 메뉴"><Link href="/about/">제품 소개</Link><Link href="/apps/">지원 도구</Link><Link href="/guides/">가이드</Link><Link href="/download/">배포 현황</Link></nav><Link className="header-cta" href="/download/">지원 현황 보기 <span aria-hidden="true">→</span></Link></div></header>}
