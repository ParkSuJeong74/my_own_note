'use client';
export default function WorkspaceError({reset}:{reset:()=>void}){
 return <section role="alert"><h1>계정 서버에 연결하지 못했어요.</h1><p>네트워크 또는 서버 상태를 확인한 뒤 다시 시도해 주세요. 기기의 무료 프로그램은 계속 사용할 수 있습니다.</p><button onClick={reset}>다시 시도</button></section>;
}
