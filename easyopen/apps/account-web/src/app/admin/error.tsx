'use client';
export default function AdminError({reset}:{reset:()=>void}){
 return <main role="alert"><h1>관리자 정보를 불러오지 못했습니다.</h1><p>서버 연결 상태를 확인한 뒤 다시 시도해 주세요.</p><button onClick={reset}>다시 시도</button></main>;
}
