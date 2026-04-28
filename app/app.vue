<script setup lang="ts">
useHead({
  script: [
    {
      innerHTML: `
        (() => {
          try {
            const storageKey = ${JSON.stringify("cbe-theme-mode")};
            const storedMode = window.localStorage.getItem(storageKey);
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const resolvedMode = storedMode === 'light' || storedMode === 'dark' || storedMode === 'system'
              ? (storedMode === 'system' ? (prefersDark ? 'dark' : 'light') : storedMode)
              : (prefersDark ? 'dark' : 'light');

            document.documentElement.classList.toggle('dark', resolvedMode === 'dark');
            document.documentElement.style.colorScheme = resolvedMode;
          } catch (error) {
            document.documentElement.classList.remove('dark');
            document.documentElement.style.colorScheme = 'light';
          }
        })();
      `,
      tagPriority: "critical",
      type: "text/javascript",
    },
  ],
});
</script>

<template>
  <NuxtRouteAnnouncer />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
