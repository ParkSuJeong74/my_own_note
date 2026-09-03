"use client";

import { useEffect, useReducer, useTransition } from "react";
import { directionEditorState } from "@/lib/direction-editor-state";

type DirectionEditorModalProps = {
  action: (data: FormData) => Promise<void>;
  content: string;
  hiddenFields?: Record<string, string>;
  title: string;
  description: string;
  openLabel: string;
  saveLabel: string;
  placeholder: string;
  maxLength: number;
};

export function DirectionEditorModal({ action, content, hiddenFields = {}, title, description, openLabel, saveLabel, placeholder, maxLength }: DirectionEditorModalProps) {
  const [state, dispatch] = useReducer(directionEditorState, "closed");
  const [pending, startTransition] = useTransition();
  const open = state === "open";

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) dispatch("cancel");
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open, pending]);

  return <>
    <button type="button" className="direction-edit-button" onClick={() => dispatch("open")}>✎ {openLabel}</button>
    {open && <div className="direction-modal-backdrop" onMouseDown={() => !pending && dispatch("cancel")}>
      <section className="direction-modal" role="dialog" aria-modal="true" aria-labelledby="direction-modal-title" onMouseDown={(event) => event.stopPropagation()}>
        <header><div><p className="eyebrow">DIRECTION EDITOR</p><h2 id="direction-modal-title">{title}</h2><p>{description}</p></div><button type="button" className="direction-modal-close" aria-label="편집기 닫기" disabled={pending} onClick={() => dispatch("cancel")}>×</button></header>
        <form onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          startTransition(async () => {
            await action(data);
            dispatch("saved");
          });
        }}>
          {Object.entries(hiddenFields).map(([name, value]) => <input type="hidden" name={name} value={value} key={name}/>)}
          <textarea name="direction" defaultValue={content} maxLength={maxLength} placeholder={placeholder} autoFocus disabled={pending}/>
          <div className="direction-modal-footer"><small>제목은 #, 목록은 - 로 시작할 수 있어요 · 최대 {maxLength.toLocaleString("ko-KR")}자</small><div><button type="button" className="secondary" disabled={pending} onClick={() => dispatch("cancel")}>Cancel</button><button disabled={pending}>{pending ? "Saving…" : saveLabel}</button></div></div>
        </form>
      </section>
    </div>}
  </>;
}
