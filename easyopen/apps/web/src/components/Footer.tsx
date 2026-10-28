import Link from 'next/link';
import { Brand } from './Brand';
export function Footer() {return <footer className="footer"><div className="shell footer-grid"><div><Brand/><p>오픈소스의 설치 준비와 실행을 쉽게. 현재 Jellyfin 통합을 검증 중입니다.</p></div><div><strong>둘러보기</strong><Link href="/apps/">지원 도구</Link><Link href="/download/">다운로드</Link></div><div><strong>EasyOpen 안내</strong><Link href="/about/">제품 소개</Link><Link href="/legal/">저작권·안전 정책</Link></div></div><div className="shell footer-bottom"><span>© {new Date().getFullYear()} EasyOpen.</span><span>원본 개발자와 각 오픈소스 프로젝트를 존중합니다.</span></div></footer>}
