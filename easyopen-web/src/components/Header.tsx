import Link from 'next/link';
import { Brand } from './Brand';
export function Header() {return <header className="site-header"><div className="shell header-inner"><Brand/><nav aria-label="주요 메뉴"><Link href="/apps/">프로그램 찾기</Link><Link href="/categories/">카테고리</Link><Link href="/guides/">EasyOpen 가이드</Link><Link href="/about/">EasyOpen 소개</Link></nav><Link className="header-cta" href="/download/">앱 다운로드 <span>↓</span></Link></div></header>}
