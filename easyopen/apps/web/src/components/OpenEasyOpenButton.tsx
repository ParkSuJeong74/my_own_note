"use client";

import { useRef, useState } from "react";
import Link from "next/link";

export function OpenEasyOpenButton({
  className = "btn btn-primary",
}: {
  className?: string;
}) {
  const [opening, setOpening] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function openApp() {
    if (opening) return;
    setOpening(true);
    setShowFallback(false);
    const stopFallback = () => {
      if (document.visibilityState === "hidden" && timer.current)
        clearTimeout(timer.current);
    };
    document.addEventListener("visibilitychange", stopFallback, { once: true });
    timer.current = setTimeout(() => {
      setOpening(false);
      setShowFallback(true);
    }, 1600);
    window.location.assign("easyopen://apps/jellyfin");
  }

  return (<div className="open-app-actions"><button
      type="button"
      className={className}
      onClick={openApp}
      aria-describedby="easyopen-open-help"
    >
      {opening ? "EasyOpen 여는 중…" : "EasyOpen에서 사용하기"}
    </button>{showFallback&&<p role="status">앱이 열리지 않았나요? <Link href="/download/">설치 파일과 지원 상태 확인</Link></p>}</div>);
}
