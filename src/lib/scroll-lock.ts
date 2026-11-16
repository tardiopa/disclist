"use client";

import { useEffect } from "react";

let locks = 0;
let previous = "";

/**
 * Stops the page from scrolling behind an overlay while the caller is mounted.
 * Overlays stack (search → detail → confirmation), so locks are counted and the
 * page is released only when the last one goes.
 *
 * The lock sits on the root element, not on <body>: locking <body> turns it into
 * its own scroll container, and the sticky header underneath then jumps to the
 * top of the document until the lock is released.
 */
export function useScrollLock() {
  useEffect(() => {
    const root = document.documentElement;
    if (locks++ === 0) {
      previous = root.style.overflow;
      root.style.overflow = "hidden";
    }
    return () => {
      if (--locks === 0) root.style.overflow = previous;
    };
  }, []);
}
