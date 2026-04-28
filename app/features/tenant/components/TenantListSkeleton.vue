<template>
    <div class="pb-10 space-y-4">
        <div
            class="overflow-hidden rounded-lg border border-border/60 bg-card shadow-sm transition-colors duration-300">
            <div class="grid grid-cols-4 gap-4 border-b border-border/60 bg-muted/20 px-4 py-3">
                <Skeleton class="h-4 w-24 rounded-lg" />
                <Skeleton class="h-4 w-20 rounded-lg" />
                <Skeleton class="h-4 w-16 rounded-lg" />
                <Skeleton class="h-4 w-16 justify-self-end rounded-lg" />
            </div>

            <div class="divide-y divide-border/60">
                <div v-for="item in 5" :key="`tenant-skeleton-${item}`"
                    class="grid grid-cols-4 items-center gap-4 px-4 py-4">
                    <div class="space-y-2">
                        <Skeleton class="h-4 w-44 rounded-lg" />
                        <Skeleton class="h-3 w-28 rounded-lg" />
                    </div>
                    <Skeleton class="h-4 w-36 rounded-lg" />
                    <Skeleton class="h-6 w-20 rounded-full" />
                    <div class="flex justify-end">
                        <Skeleton class="h-9 w-9 rounded-lg" />
                    </div>
                </div>
            </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3">
            <Skeleton class="h-4 w-36 rounded-lg" />
            <div class="flex items-center gap-2">
                <Skeleton class="h-9 w-24 rounded-lg" />
                <Skeleton class="h-4 w-24 rounded-lg" />
                <Skeleton class="h-9 w-20 rounded-lg" />
            </div>
        </div>
    </div>
</template>