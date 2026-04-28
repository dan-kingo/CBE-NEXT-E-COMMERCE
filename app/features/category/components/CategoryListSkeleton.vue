<template>
    <div class="pb-10 space-y-4">
        <div class="overflow-hidden rounded-lg border border-border/60 bg-white shadow-sm">
            <div class="grid grid-cols-4 gap-4 border-b border-border/60 bg-muted/20 px-4 py-3">
                <Skeleton class="h-4 w-24 rounded-lg" />
                <Skeleton class="h-4 w-16 rounded-lg" />
                <Skeleton class="h-4 w-20 rounded-lg" />
                <Skeleton class="h-4 w-16 justify-self-end rounded-lg" />
            </div>

            <div class="divide-y divide-border/60">
                <div v-for="item in 5" :key="`category-skeleton-${item}`"
                    class="grid grid-cols-4 items-center gap-4 px-4 py-4">
                    <div class="flex items-center gap-3">
                        <Skeleton class="size-4 rounded-full" />
                        <div class="space-y-2">
                            <Skeleton class="h-4 w-48 rounded-lg" />
                            <Skeleton class="h-3 w-28 rounded-lg" />
                        </div>
                    </div>
                    <Skeleton class="h-4 w-32 rounded-lg" />
                    <Skeleton class="h-4 w-10 rounded-lg" />
                    <div class="flex justify-end">
                        <Skeleton class="h-9 w-9 rounded-lg" />
                    </div>
                </div>
            </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3">
            <Skeleton class="h-4 w-40 rounded-lg" />
            <div class="flex items-center gap-2">
                <Skeleton class="h-9 w-24 rounded-lg" />
                <Skeleton class="h-4 w-24 rounded-lg" />
                <Skeleton class="h-9 w-20 rounded-lg" />
            </div>
        </div>
    </div>
</template>