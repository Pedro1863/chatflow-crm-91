import { useState, useEffect } from "react";

type Theme = "dark" | "light";

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  return (localStorage.getItem("theme") as Theme) || "dark";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getStoredTheme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return { theme, setTheme, toggleTheme };
}
