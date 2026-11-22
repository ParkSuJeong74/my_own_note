import Link from 'next/link';
import {Brand} from './Brand';

export function Header(){return <header className="site-header"><div className="shell header-inner"><Brand/><nav aria-label="주요 메뉴"><Link className="header-download" href="/download/">다운로드</Link></nav></div></header>}
