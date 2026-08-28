"use client";

import {useEffect,useRef} from "react";
import {useFormStatus} from "react-dom";

export function SubmitAndClose({children}:{children:React.ReactNode}){
  const {pending}=useFormStatus(),buttonRef=useRef<HTMLButtonElement>(null),submitted=useRef(false);
  useEffect(()=>{if(pending){submitted.current=true;return;}if(submitted.current){buttonRef.current?.closest("details")?.removeAttribute("open");submitted.current=false;}},[pending]);
  return <button ref={buttonRef} type="submit" disabled={pending}>{pending?"저장 중…":children}</button>;
}
