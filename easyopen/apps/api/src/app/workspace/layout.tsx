import './tokens.css';
import type {ReactNode} from 'react';
import Link from 'next/link';
import styles from './workspace.module.css';
export default function WorkspaceLayout({children}: {children: ReactNode}) {
  return <div className={styles.shell}>
    <aside className={styles.sidebar}>
      <div className={styles.brand}><span>e</span>EasyOpen</div>
      <nav className={styles.nav} aria-label="온라인 작업 공간">
        <Link href="/workspace">내 계정</Link><Link href="/workspace/programs">프로그램</Link><Link href="/workspace/purchases">이용 권한</Link>
      </nav>
    </aside>
    <main className={styles.main}><div className={styles.top}>EasyOpen · 온라인 작업 공간</div>{children}</main>
  </div>;
}
