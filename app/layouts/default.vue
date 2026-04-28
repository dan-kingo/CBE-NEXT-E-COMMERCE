<template>
  <div
    class="relative min-h-screen overflow-hidden bg-background font-brand text-foreground transition-colors duration-300">
    <div
      class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(149,41,142,0.08),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(0,220,130,0.06),transparent_32%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(193,91,239,0.16),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(0,220,130,0.08),transparent_32%),linear-gradient(180deg,rgba(9,12,24,1)_0%,rgba(4,6,12,1)_100%)]" />

    <div class="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
      <ThemeModeToggle />
    </div>

    <main class="relative z-10">
      <slot />
    </main>
  </div>
</template>
