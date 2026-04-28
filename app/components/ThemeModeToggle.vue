<script setup lang="ts">
import { LaptopMinimal, MoonStar, SunMedium } from "lucide-vue-next";
import type { Component } from "vue";
import type { ThemeMode } from "~/composables/useThemeMode";

const { mode, setMode } = useThemeMode();

const themeModes: Array<{
    icon: Component;
    label: string;
    value: ThemeMode;
}> = [
        { icon: SunMedium, label: "Light", value: "light" },
        { icon: LaptopMinimal, label: "System", value: "system" },
        { icon: MoonStar, label: "Dark", value: "dark" },
    ];
</script>

<template>
    <div
        class="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/90 p-1 shadow-sm backdrop-blur supports-backdrop-filter:bg-background/80 dark:border-white/10 dark:bg-slate-950/80">
        <button v-for="themeMode in themeModes" :key="themeMode.value" type="button"
            class="inline-flex cursor-pointer size-9 items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            :class="mode === themeMode.value
                    ? 'bg-brand text-white shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                " :aria-pressed="mode === themeMode.value" :aria-label="themeMode.label" :title="themeMode.label"
            @click="setMode(themeMode.value)">
            <component :is="themeMode.icon" class="size-4" />
        </button>
    </div>
</template>