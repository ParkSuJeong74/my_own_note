"use client";

import {useState} from "react";

export function ClipboardCopyButton({text}:{text:string}){const [copied,setCopied]=useState(false);async function copy(){try{await navigator.clipboard.writeText(text);}catch{const area=document.createElement("textarea");area.value=text;area.style.position="fixed";area.style.opacity="0";document.body.append(area);area.select();document.execCommand("copy");area.remove();}setCopied(true);window.setTimeout(()=>setCopied(false),1600);}return <button type="button" className="postit-copy" onClick={copy} aria-label="포스트잇 본문 복사">{copied?"복사됨 ✓":"⧉ 복사"}</button>}
