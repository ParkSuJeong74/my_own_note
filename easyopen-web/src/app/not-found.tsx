import Link from 'next/link';
export default function NotFound(){return <section className="shell page-section empty-state"><h1>페이지를 찾을 수 없어요.</h1><p>주소가 변경되었거나 존재하지 않는 페이지입니다.</p><Link className="btn btn-primary" href="/">홈으로 돌아가기</Link></section>}
