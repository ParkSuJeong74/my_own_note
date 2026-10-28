"use client";

import { useEffect, useRef, useState } from "react";

export function OpenEasyOpenButton({
  className = "btn btn-primary",
}: {
  className?: string;
}) {
  const [opening, setOpening] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const launcher = useRef<HTMLIFrameElement | null>(null);

  function cleanUp() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    launcher.current?.remove();
    launcher.current = null;
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  }

  function handleVisibilityChange() {
    if (document.visibilityState === "hidden") cleanUp();
  }

  useEffect(() => cleanUp, []);

  function openApp() {
    if (opening) return;
    setOpening(true);
    launcher.current = document.createElement("iframe");
    launcher.current.hidden = true;
    launcher.current.setAttribute("aria-hidden", "true");
    launcher.current.src = "easyopen://apps/jellyfin";
    document.body.appendChild(launcher.current);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    timer.current = setTimeout(() => {
      cleanUp();
      window.location.assign("/download/");
    }, 1600);
  }

  return (<div className="open-app-actions"><button
      type="button"
      className={className}
      onClick={openApp}
      aria-describedby="easyopen-open-help"
    >
      {opening ? "EasyOpen 여는 중…" : "EasyOpen에서 사용하기"}
    </button></div>);
}
