import { createContext, useContext, useEffect, useMemo, useState } from "react";

const THEME_STORAGE_KEY = "lcc-theme";
const THEMES = {
  LIGHT: "light",
  DARK: "dark",
};

function resolveInitialTheme() {
  if (typeof window === "undefined") {
    return THEMES.LIGHT;
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

  if (storedTheme === THEMES.DARK || storedTheme === THEMES.LIGHT) {
    return storedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? THEMES.DARK
    : THEMES.LIGHT;
}

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(resolveInitialTheme);

  useEffect(() => {
    const rootElement = document.documentElement;
    rootElement.classList.toggle(THEMES.DARK, theme === THEMES.DARK);
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((currentTheme) =>
      currentTheme === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK
    );
  }

  const contextValue = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
      isDark: theme === THEMES.DARK,
    }),
    [theme]
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used inside a ThemeProvider.");
  }

  return context;
}
