"use client";

import { useCallback, useEffect, useState } from "react";

export type Theme = "system" | "light" | "dark";

export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, set] = useState<Theme>("system");
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") set(saved);
  }, []);
  const setTheme = useCallback((t: Theme) => {
    set(t);
    if (t === "system") {
      localStorage.removeItem("theme");
      delete document.documentElement.dataset.theme;
    } else {
      localStorage.setItem("theme", t);
      document.documentElement.dataset.theme = t;
    }
  }, []);
  return [theme, setTheme];
}
