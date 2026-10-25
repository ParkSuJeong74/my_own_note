import Link from 'next/link';
import { Brand } from './Brand';
export function Header() {return <header className="site-header"><div className="shell header-inner"><Brand/><nav aria-label="주요 메뉴"><Link href="/apps/">프로그램 찾기</Link><Link href="/categories/">카테고리</Link><Link href="/guides/">사용 가이드</Link><Link href="/about/">EasyOpen 소개</Link></nav><Link className="header-cta" href="/apps/">무료 프로그램 탐색 <span>↗</span></Link></div></header>}
