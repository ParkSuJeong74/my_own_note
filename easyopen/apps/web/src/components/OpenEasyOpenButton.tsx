"use client";

import { useRef, useState } from "react";

export function OpenEasyOpenButton({
  className = "btn btn-primary",
}: {
  className?: string;
}) {
  const [opening, setOpening] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function openApp() {
    if (opening) return;
    setOpening(true);
    const stopFallback = () => {
      if (document.visibilityState === "hidden" && timer.current)
        clearTimeout(timer.current);
    };
    document.addEventListener("visibilitychange", stopFallback, { once: true });
    timer.current = setTimeout(() => {
      window.location.assign("/download/");
    }, 1400);
    window.location.assign("easyopen://apps/jellyfin");
  }

  return (
    <button
      type="button"
      className={className}
      onClick={openApp}
      aria-describedby="easyopen-open-help"
    >
      {opening ? "EasyOpen 여는 중…" : "EasyOpen에서 사용하기"}
    </button>
  );
}
