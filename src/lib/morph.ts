"use client";

import { flushSync } from "react-dom";

type Doc = Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };

const coverOf = (id: string) => document.querySelector<HTMLElement>(`[data-cover="${CSS.escape(id)}"]`);

let busy = false;

/**
 * Opens the detail view: the cover travels from its place in the grid/list to
 * the detail view (the element carrying `.cover-target`) while the rest
 * cross-fades; the record appears and slides out once the cover has landed
 * (see `.wax-reveal`). Closing is a plain fade handled by the view itself.
 *
 * Falls back to a plain state change where view transitions are unavailable.
 * Returns true when the browser animates the change itself.
 */
export function morphOpen(id: string | null, update: () => void): boolean {
  const doc = document as Doc;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (busy) return true;
  if (!doc.startViewTransition || reduced) {
    update();
    return false;
  }

  const tile = id ? coverOf(id) : null;
  const sleeve = tile?.closest<HTMLElement>(".sleeve") ?? null;
  const cleanup = () => {
    sleeve?.classList.remove("wax-hidden");
    if (tile) tile.style.viewTransitionName = "";
    busy = false;
  };

  busy = true;
  try {
    // The record tucked behind the tile's cover would be exposed once the cover leaves.
    sleeve?.classList.add("wax-hidden");
    if (tile) tile.style.viewTransitionName = "cover";
    const transition = doc.startViewTransition(() => {
      if (tile) tile.style.viewTransitionName = "";
      flushSync(update);
    });
    transition.finished.catch(() => {}).finally(cleanup);
    return true;
  } catch {
    cleanup();
    update();
    return false;
  }
}
