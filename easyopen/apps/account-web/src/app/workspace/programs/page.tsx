import styles from '../workspace.module.css';
export default function ProgramsPage() {
  return <>
    <h1 className={styles.heading}>프로그램</h1><p className={styles.description}>프로그램 정보를 확인하고 기기에 맞는 기능을 이용하세요.</p>
    <div className={styles.grid}>
      <section className={styles.card}><h2>Jellyfin</h2><span className={styles.tag}>미디어 라이브러리</span><p>내 영화와 음악을 모아 이용하는 미디어 서버입니다. PC에서 서버를 준비하고 휴대폰에서 연결합니다.</p><p>설치와 실행 상태는 해당 기기의 EasyOpen에서 확인하세요.</p></section>
      <section className={styles.card}><h2>CosyVoice</h2><span className={styles.tag}>실행 환경 검증 전</span><p>텍스트 음성 생성 프로그램입니다. Windows NVIDIA 환경에서 실행할 후보를 준비하고 있습니다.</p><p>모델 출처와 실행 환경 검증 후 제공 범위를 안내합니다.</p></section>
    </div>
    <section className={styles.card}><h2>유료 에디션</h2><p>상품 구성, 가격, 이용 기간과 결제 공급자는 준비 중입니다. 확정된 판매 조건이 생기면 이곳에서 안내합니다.</p></section>
  </>;
}
