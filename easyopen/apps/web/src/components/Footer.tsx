import Link from 'next/link';
import {Brand} from './Brand';

export function Footer(){return <footer className="footer"><div className="shell footer-grid"><div><Brand/><p>복잡한 오픈소스 프로그램을 누구나 더 쉽게 시작하고 관리할 수 있도록 돕습니다.</p></div><div><strong>EasyOpen</strong><Link href="/download/">다운로드</Link><Link href="/legal/">운영·개인정보 안내</Link></div></div><div className="shell footer-bottom"><span>© {new Date().getFullYear()} EasyOpen.</span><span>원본 개발자와 각 오픈소스 프로젝트를 존중합니다.</span></div></footer>}
