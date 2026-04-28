import {
  applyThemeMode,
  themeModeStorageKey,
  type ThemeMode,
} from "~/composables/useThemeMode";

const isThemeMode = (value: string | null): value is ThemeMode =>
  value === "light" || value === "dark" || value === "system";

export default defineNuxtPlugin(() => {
  const storedMode = window.localStorage.getItem(themeModeStorageKey);
  const mode = isThemeMode(storedMode) ? storedMode : "system";

  applyThemeMode(mode);

  const syncTheme = () => {
    const currentMode = window.localStorage.getItem(themeModeStorageKey);
    applyThemeMode(isThemeMode(currentMode) ? currentMode : "system");
  };

  const prefersDarkQuery = window.matchMedia("(prefers-color-scheme: dark)");
  prefersDarkQuery.addEventListener("change", syncTheme);
  window.addEventListener("storage", syncTheme);
});
