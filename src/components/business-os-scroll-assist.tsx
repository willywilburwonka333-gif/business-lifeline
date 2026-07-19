"use client";

import { useEffect } from "react";

const MODULE_SELECTOR = ".os-command-grid, .os-module";
const TRIGGER_SELECTOR = ".os-tabs button, .business-os-actions button";

export function BusinessOsScrollAssist() {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || !target.closest(TRIGGER_SELECTOR)) return;

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          const module = document.querySelector<HTMLElement>(MODULE_SELECTOR);
          module?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      });
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return null;
}
