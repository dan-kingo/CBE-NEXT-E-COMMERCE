<script setup lang="ts">
import { onBeforeUnmount, onMounted } from "vue";
import {
    applyThemeMode,
    themeModeStorageKey,
    type ThemeMode,
} from "~/composables/useThemeMode";

const isThemeMode = (value: string | null): value is ThemeMode =>
    value === "light" || value === "dark" || value === "system";

const disableThemeMode = () => {
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "light";
};

const restoreThemeMode = () => {
    const storedMode = window.localStorage.getItem(themeModeStorageKey);
    applyThemeMode(isThemeMode(storedMode) ? storedMode : "system");
};

onMounted(disableThemeMode);
onBeforeUnmount(restoreThemeMode);
</script>

<template>
    <div class="relative min-h-screen overflow-hidden bg-darkbrand text-golden">
        <div
            class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(149,41,142,0.14),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(149,41,142,0.08),transparent_30%),linear-gradient(180deg,rgba(9,12,24,0.55)_0%,rgba(4,6,12,0.9)_100%)]" />

        <main class="relative z-10">
            <slot />
        </main>
    </div>
</template>