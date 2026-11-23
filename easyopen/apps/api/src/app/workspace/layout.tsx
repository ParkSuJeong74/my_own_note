import './tokens.css';
import type {ReactNode} from 'react';
import {WorkspaceNavigation} from './WorkspaceNavigation';
import styles from './workspace.module.css';
export default function WorkspaceLayout({children}: {children: ReactNode}) {
  return <div className={styles.shell}>
    <a className={styles.skipLink} href="#workspace-main">본문으로 이동</a>
    <aside className={styles.sidebar}>
      <div className={styles.brand}><span>e</span>EasyOpen</div>
      <WorkspaceNavigation/>
    </aside>
    <main id="workspace-main" tabIndex={-1} className={styles.main}><div className={styles.top}>EasyOpen · 온라인 작업 공간</div>{children}</main>
  </div>;
}
