"use client";

import { useEffect, useMemo, useState } from "react";

export type TutorialStep = {
  title: string;
  body: string;
  target?: string;
  actionLabel?: string;
};

type ProductTutorialProps = {
  tutorialId: string;
  title: string;
  steps: TutorialStep[];
  open: boolean;
  onClose: () => void;
  onStep?: (step: TutorialStep, index: number) => void;
};

export const tutorialStorageKey = (id: string) => `business-lifeline-tutorial-${id}-v1`;

export function ProductTutorial({ tutorialId, title, steps, open, onClose, onStep }: ProductTutorialProps) {
  const [index, setIndex] = useState(0);
  const step = steps[index];
  const progress = useMemo(() => Math.round(((index + 1) / steps.length) * 100), [index, steps.length]);

  useEffect(() => {
    if (!open) return;
    setIndex(0);
  }, [open, tutorialId]);

  useEffect(() => {
    if (!open || !step) return;
    onStep?.(step, index);
    if (!step.target) return;
    const timer = window.setTimeout(() => {
      const target = document.querySelector<HTMLElement>(step.target!);
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      target?.classList.add("tutorial-target");
    }, 80);
    return () => {
      window.clearTimeout(timer);
      document.querySelectorAll(".tutorial-target").forEach((item) => item.classList.remove("tutorial-target"));
    };
  }, [index, onStep, open, step]);

  if (!open || !step) return null;

  const finish = () => {
    window.localStorage.setItem(tutorialStorageKey(tutorialId), "complete");
    document.querySelectorAll(".tutorial-target").forEach((item) => item.classList.remove("tutorial-target"));
    onClose();
  };

  return (
    <aside className="product-tutorial" role="dialog" aria-modal="false" aria-labelledby="product-tutorial-title">
      <div className="product-tutorial-progress"><i style={{ width: `${progress}%` }} /></div>
      <div className="product-tutorial-heading">
        <small>{title} · {index + 1} of {steps.length}</small>
        <button type="button" onClick={finish} aria-label="Skip tutorial">Skip</button>
      </div>
      <h2 id="product-tutorial-title">{step.title}</h2>
      <p>{step.body}</p>
      <div className="product-tutorial-actions">
        <button type="button" className="button ghost" disabled={index === 0} onClick={() => setIndex((current) => Math.max(0, current - 1))}>Back</button>
        <button type="button" className="button primary" onClick={() => index === steps.length - 1 ? finish() : setIndex((current) => current + 1)}>{index === steps.length - 1 ? "Finish" : step.actionLabel ?? "Next"} <span>→</span></button>
      </div>
    </aside>
  );
}
