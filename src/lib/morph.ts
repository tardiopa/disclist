"use client";

import { flushSync } from "react-dom";

type Doc = Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };

const coverOf = (id: string) => document.querySelector<HTMLElement>(`[data-cover="${CSS.escape(id)}"]`);

/**
 * Opens or closes the detail view with the cover travelling between its place
 * in the grid/list and the detail view (the element carrying `.cover-target`).
 * Falls back to a plain state change where view transitions are unavailable.
 * Returns true when the browser is animating the change itself.
 */
export function morph(dir: "open" | "close", id: string | null, update: () => void): boolean {
  const doc = document as Doc;
  const tile = id ? coverOf(id) : null;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!doc.startViewTransition || reduced || (dir === "open" && !tile)) {
    update();
    return false;
  }
  try {
    if (dir === "open") tile!.style.viewTransitionName = "cover";
    const transition = doc.startViewTransition(() => {
      if (dir === "open") tile!.style.viewTransitionName = "";
      flushSync(update);
      if (dir === "close" && id) {
        const back = coverOf(id);
        if (back) back.style.viewTransitionName = "cover";
      }
    });
    transition.finished
      .catch(() => {})
      .finally(() => {
        if (id) {
          const el = coverOf(id);
          if (el) el.style.viewTransitionName = "";
        }
      });
    return true;
  } catch {
    if (tile) tile.style.viewTransitionName = "";
    update();
    return false;
  }
}
