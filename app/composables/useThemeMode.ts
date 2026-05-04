import { usePreferredDark, useStorage } from "@vueuse/core";

export type ThemeMode = "light" | "dark" | "system";

export const themeModeStorageKey = "cbe-theme-mode";

const isThemeMode = (value: unknown): value is ThemeMode =>
  value === "light" || value === "dark" || value === "system";

export const resolveThemeMode = (
  mode: ThemeMode,
  prefersDark: boolean,
): "light" | "dark" =>
  mode === "system" ? (prefersDark ? "dark" : "light") : mode;

export const applyThemeMode = (mode: ThemeMode) => {
  if (!import.meta.client) {
    return;
  }

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolvedMode = resolveThemeMode(mode, prefersDark);
  const root = document.documentElement;

  root.classList.toggle("dark", resolvedMode === "dark");
  root.style.colorScheme = resolvedMode;
};

export const useThemeMode = () => {
  const storedMode = useStorage<ThemeMode>(themeModeStorageKey, "system");
  const preferredDark = usePreferredDark();

  const mode = computed<ThemeMode>({
    get: () => (isThemeMode(storedMode.value) ? storedMode.value : "system"),
    set: (value) => {
      storedMode.value = value;
    },
  });

  const resolvedMode = computed(() =>
    resolveThemeMode(mode.value, preferredDark.value),
  );

  const isDark = computed(() => resolvedMode.value === "dark");

  watch(
    [mode, preferredDark],
    () => {
      if (!import.meta.client) {
        return;
      }

      applyThemeMode(mode.value);
    },
    { immediate: true },
  );

  const setMode = (value: ThemeMode) => {
    mode.value = value;
  };

  return {
    isDark,
    mode,
    resolvedMode,
    setMode,
  };
};
