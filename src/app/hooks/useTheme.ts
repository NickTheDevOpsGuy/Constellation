import { useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";

function applyTheme(t: Theme) {
  const root = document.documentElement;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = t === "dark" || (t === "system" && prefersDark);
  root.classList.toggle("dark", isDark);
  // debug:
  console.log("[theme] applied:", t, "→ dark?", isDark);
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const stored = (localStorage.getItem("theme") as Theme) || "system";
    setTheme(stored);
    applyTheme(stored);

    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const curr = (localStorage.getItem("theme") as Theme) || "system";
      if (curr === "system") applyTheme("system");
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const setThemeAndApply = (t: Theme) => {
    localStorage.setItem("theme", t);
    setTheme(t);
    applyTheme(t);
    const root = document.documentElement;
    root.classList.add("theme-transition");
    setTimeout(() => root.classList.remove("theme-transition"), 170);
  };

  return { theme, setTheme: setThemeAndApply };
}
