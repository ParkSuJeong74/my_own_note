"use client";

import { useState } from "react";

export function PromptPanel({ title, prompt, openChatGpt=false }:{title:string;prompt:string;openChatGpt?:boolean}) {
  const [copied,setCopied]=useState(false);
  async function copy(){await navigator.clipboard.writeText(prompt);setCopied(true);window.setTimeout(()=>setCopied(false),1500);}
  return <section className="prompt-panel"><div className="section-heading"><h2>{title}</h2><div className="button-row"><button type="button" className="secondary" onClick={copy}>{copied?"Copied":"Copy prompt"}</button>{openChatGpt&&<a className="button-link" href="https://chatgpt.com/" target="_blank" rel="noreferrer">Open ChatGPT</a>}</div></div><pre>{prompt}</pre></section>;
}
