"use client";
import {useEffect} from "react";
export default function ErrorBoundary({error,reset}:{error:Error&{digest?:string};reset:()=>void}){useEffect(()=>{void fetch("/api/errors",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({source:"admin-ui",message:error.message,digest:error.digest})});},[error]);return <div className="empty-state"><h2>이 페이지를 불러오지 못했습니다.</h2><p>오류가 Error Logs에 기록되었습니다.</p><button onClick={reset}>다시 시도</button></div>}
