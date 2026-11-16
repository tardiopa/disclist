"use client";

import { flushSync } from "react-dom";

type Doc = Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };

const coverOf = (id: string) => document.querySelector<HTMLElement>(`[data-cover="${CSS.escape(id)}"]`);
const sleeveOf = (cover: Element | null) => cover?.closest<HTMLElement>(".sleeve") ?? null;

function recordIsOut(sleeve: HTMLElement | null): boolean {
  const wax = sleeve?.querySelector(".wax");
  if (!wax) return false;
  const t = getComputedStyle(wax).transform;
  return t !== "none" && t !== "matrix(1, 0, 0, 1, 0, 0)";
}

const RETRACT_MS = 200;
let busy = false;

/**
 * Opens or closes the detail view with the cover travelling between its place
 * in the grid/list and the detail view (the element carrying `.cover-target`).
 *
 * Sequence: the record of the departing sleeve slides back in and hides, the
 * cover travels, and the arriving record only shows once the cover has landed.
 *
 * Falls back to a plain state change where view transitions are unavailable.
 * Returns true when the browser animates the change itself.
 */
export function morph(dir: "open" | "close", id: string | null, update: () => void): boolean {
  const doc = document as Doc;
  const tile = id ? coverOf(id) : null;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (busy) return true;
  if (!doc.startViewTransition || reduced || (dir === "open" && !tile)) {
    update();
    return false;
  }

  const fromSleeve = sleeveOf(dir === "open" ? tile : document.querySelector(".cover-target"));
  const touched = new Set<HTMLElement>();
  const mark = (el: HTMLElement | null, ...classes: string[]) => {
    if (!el) return;
    el.classList.add(...classes);
    touched.add(el);
  };
  const cleanup = () => {
    touched.forEach((el) => el.classList.remove("retract", "wax-hidden"));
    if (id) {
      const el = coverOf(id);
      if (el) el.style.viewTransitionName = "";
    }
    busy = false;
  };

  const travel = () => {
    try {
      mark(fromSleeve, "wax-hidden");
      if (dir === "open") tile!.style.viewTransitionName = "cover";
      const transition = doc.startViewTransition!(() => {
        if (dir === "open") tile!.style.viewTransitionName = "";
        flushSync(update);
        if (dir === "close" && id) {
          const back = coverOf(id);
          if (back) {
            back.style.viewTransitionName = "cover";
            mark(sleeveOf(back), "wax-hidden");
          }
        }
      });
      transition.finished.catch(() => {}).finally(cleanup);
    } catch {
      cleanup();
      update();
    }
  };

  busy = true;
  if (recordIsOut(fromSleeve)) {
    mark(fromSleeve, "retract");
    setTimeout(travel, RETRACT_MS);
  } else {
    travel();
  }
  return true;
}
