"use client";

import { useEffect, useState } from "react";

export function ConnectionStatus() {
  const [online, setOnline] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setOnline(window.navigator.onLine);
    sync();
    setReady(true);
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!ready || online) return null;

  return (
    <div className="connection-status" role="status" aria-live="polite">
      <strong>You’re offline.</strong>
      <span>Your saved local records remain available. AI features will resume when your connection returns.</span>
    </div>
  );
}
