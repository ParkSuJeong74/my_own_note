'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import styles from './workspace.module.css';

const items = [
  {href: '/workspace', label: '내 계정'},
  {href: '/workspace/programs', label: '프로그램'},
  {href: '/workspace/purchases', label: '이용 권한'},
];
export function WorkspaceNavigation() {
  const pathname = usePathname();
  return <nav className={styles.nav} aria-label="온라인 작업 공간">
    {items.map(item => <Link key={item.href} href={item.href} aria-current={pathname === item.href ? 'page' : undefined}>{item.label}</Link>)}
  </nav>;
}
