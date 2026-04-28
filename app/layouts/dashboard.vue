<script setup lang="ts">
import { useAuth } from "~/features/auth/composables/useAuth";
import { menuItems } from "~/utils/constants";
import { ChevronDown, ChevronRight } from "lucide-vue-next";

const route = useRoute();
const { logout, profile, fetchProfile } = useAuth();
const toast = useToast();

const isProfileMenuOpen = ref(false);
const profileMenuRef = ref<HTMLElement | null>(null);

const normalizePath = (path: string) =>
    path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;

const toDashboardPath = (path: string) => {
    const normalized = normalizePath(path);

    if (
        normalized === "/admin" ||
        normalized.startsWith("/admin/") ||
        normalized === "/categories" ||
        normalized.startsWith("/categories/") ||
        normalized === "/subscriptions" ||
        normalized.startsWith("/subscriptions/") ||
        normalized === "/tenants" ||
        normalized.startsWith("/tenants/")
    ) {
        return `/dashboard${normalized}`;
    }

    return normalized;
};

const profileInitials = computed(() => {
    const firstInitial = profile.value?.firstName?.charAt(0) ?? "A";
    return `${firstInitial}`;
});

const adminName = computed(() => {
    const firstName = profile.value?.firstName ?? "Admin";
    const lastName = profile.value?.lastName ?? "One";

    return `${firstName} ${lastName}`;
});

const adminEmail = computed(() => profile.value?.email || "admin@example.com");

const activeMenuItem = computed(() => {
    const currentPath = toDashboardPath(route.path);

    return menuItems.find((item) => {
        const targetPath = normalizePath(item.to);

        if (targetPath === "/dashboard") {
            return currentPath === targetPath;
        }

        return (
            currentPath === targetPath || currentPath.startsWith(`${targetPath}/`)
        );
    });
});

const breadcrumbItems = computed(() => {
    const dashboardItem = menuItems.find((item) => item.to === "/dashboard");
    const currentPath = toDashboardPath(route.path);
    const items: Array<{ to: string; title: string }> = [];

    if (!dashboardItem) {
        return activeMenuItem.value ? [activeMenuItem.value] : [];
    }

    items.push({ to: dashboardItem.to, title: dashboardItem.title });

    const activeItem = activeMenuItem.value;
    if (activeItem && activeItem.to !== dashboardItem.to) {
        items.push({ to: activeItem.to, title: activeItem.title });
    }

    if (
        currentPath.startsWith("/dashboard/admin/") ||
        currentPath.startsWith("/dashboard/categories/") ||
        currentPath.startsWith("/dashboard/subscriptions/") ||
        currentPath.startsWith("/dashboard/tenants/")
    ) {
        const segments = currentPath.split("/").filter(Boolean);
        const lastSegment = segments[segments.length - 1];

        if (lastSegment === "create") {
            items.push({ to: currentPath, title: "Create" });
        } else if (lastSegment === "edit") {
            items.push({ to: currentPath, title: "Edit" });
        } else if (lastSegment === "stats") {
            items.push({ to: currentPath, title: "Stats" });
        }
    }

    return items.filter(
        (item, index, arr) =>
            index === arr.findIndex((candidate) => candidate.to === item.to),
    );
});

const formatBreadcrumbFromPath = (to: string) => {
    const normalizedTo = normalizePath(to);
    const withoutDashboardPrefix = normalizedTo.replace(/^\/dashboard\/?/, "");

    if (!withoutDashboardPrefix) {
        return "Dashboard";
    }

    const label = withoutDashboardPrefix.replace(/[-_]/g, " ").trim();

    return label.charAt(0).toUpperCase() + label.slice(1);
};

const getBreadcrumbLabel = (item: { to: string; title: string }) => {
    if (item.title === "Create" || item.title === "Edit") {
        return item.title;
    }

    return formatBreadcrumbFromPath(item.to);
};

const handleDocumentClick = (event: MouseEvent) => {
    if (!isProfileMenuOpen.value || !profileMenuRef.value) {
        return;
    }

    const target = event.target as Node | null;
    if (!target || profileMenuRef.value.contains(target)) {
        return;
    }

    isProfileMenuOpen.value = false;
};

onMounted(() => {
    document.addEventListener("click", handleDocumentClick, true);

    void fetchProfile().catch((error) => {
        console.error("Failed to fetch profile in dashboard layout:", error);
    });
});

onBeforeUnmount(() => {
    document.removeEventListener("click", handleDocumentClick, true);
});

const handleLogout = async () => {
    try {
        isProfileMenuOpen.value = false;
        logout();
        toast.success({ message: "Logged out successfully!" });
    } catch (error: any) {
        const message =
            error?.data?.message ||
            error?.data?.error ||
            error?.message ||
            "Logout failed. Please try again.";
        console.error("Logout error:", error);
        toast.error({
            message: message,
        });
    }
};
</script>

<template>
    <SidebarProvider
        class="relative min-h-screen overflow-hidden bg-background text-foreground transition-colors duration-300">
        <div
            class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(149,41,142,0.10),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(0,220,130,0.08),transparent_30%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(193,91,239,0.20),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(0,220,130,0.10),transparent_32%),linear-gradient(180deg,rgba(9,12,24,1)_0%,rgba(4,6,12,1)_100%)]" />

        <DashboardSidebar />

        <SidebarInset
            class="relative z-10 min-h-screen bg-transparent font-brand px-3 pb-3 pt-3 transition-colors duration-300 md:px-4 md:pb-4 md:pt-4 ml-6 md:ml-8">
            <header
                class="sticky top-3 z-20 flex h-18 items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/85 px-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur transition-colors duration-300 dark:border-white/10 dark:bg-slate-950/80 dark:shadow-[0_16px_36px_rgba(0,0,0,0.45)]">
                <div class="flex min-w-0 items-center gap-3">
                    <SidebarTrigger class="cursor-pointer rounded-lg border border-border/70 p-1.5 hover:bg-muted" />

                    <div class="hidden sm:flex min-w-0 items-center gap-3 whitespace-nowrap">
                        <template v-for="(item, index) in breadcrumbItems" :key="item.to">
                            <NuxtLink v-if="index < breadcrumbItems.length - 1" :to="item.to"
                                class="text-lg font-medium text-muted-foreground transition-colors hover:text-foreground">
                                {{ getBreadcrumbLabel(item) }}
                            </NuxtLink>
                            <span v-else class="text-xl font-semibold text-foreground">
                                {{ getBreadcrumbLabel(item) }}
                            </span>

                            <ChevronRight v-if="index < breadcrumbItems.length - 1"
                                class="size-5 shrink-0 text-muted-foreground" />
                        </template>
                    </div>
                </div>

                <div class="flex items-center gap-3">
                    <ThemeModeToggle class="hidden lg:inline-flex" />

                    <div ref="profileMenuRef" class="relative">
                        <Button variant="ghost"
                            class="h-12 cursor-pointer rounded-full border border-border/60 bg-background px-2 pr-3 shadow-sm transition-colors duration-300 dark:bg-slate-950/90"
                            @click="isProfileMenuOpen = !isProfileMenuOpen">
                            <span
                                class="flex size-9 items-center justify-center rounded-full bg-brand/20 text-sm font-semibold text-brand/80">
                                {{ profileInitials }}
                            </span>
                            <ChevronDown class="size-5 text-muted-foreground transition-transform"
                                :class="isProfileMenuOpen ? 'rotate-180' : ''" />
                        </Button>

                        <div v-if="isProfileMenuOpen"
                            class="absolute right-0 top-full z-20 mt-2 w-72 rounded-2xl border border-border/80 bg-background p-4 shadow-lg transition-colors duration-300 dark:border-white/10 dark:bg-slate-950">
                            <div class="mb-3 border-b border-border/70 pb-3 dark:border-white/10">
                                <p class="text-base font-semibold text-foreground">
                                    {{ adminName }}
                                </p>
                                <p class="text-sm text-muted-foreground">{{ adminEmail }}</p>
                            </div>

                            <Button variant="outline" class="w-full cursor-pointer justify-start"
                                @click.prevent="handleLogout">
                                <Icon name="lucide:log-out" />
                                Logout
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            <main class="pt-4 md:pt-5">
                <slot />
            </main>
        </SidebarInset>
    </SidebarProvider>
</template>
