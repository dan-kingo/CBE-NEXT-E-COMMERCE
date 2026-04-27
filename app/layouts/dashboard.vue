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
    normalized === "/categories" ||
    normalized.startsWith("/categories/") ||
    normalized === "/subscriptions" ||
    normalized.startsWith("/subscriptions/")
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
    currentPath.startsWith("/dashboard/categories/") ||
    currentPath.startsWith("/dashboard/subscriptions/")
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
  <SidebarProvider>
    <DashboardSidebar />

    <SidebarInset class="min-h-screen bg-gray-100 font-brand">
      <header
        class="sticky top-0 z-10 flex h-14 items-center justify-between gap-2 border-b bg-background/80 px-4 backdrop-blur"
      >
        <div class="flex min-w-0 items-center gap-3">
          <SidebarTrigger class="cursor-pointer" />

          <div
            class="hidden sm:flex min-w-0 items-center gap-2 whitespace-nowrap"
          >
            <template v-for="(item, index) in breadcrumbItems" :key="item.to">
              <NuxtLink
                v-if="index < breadcrumbItems.length - 1"
                :to="item.to"
                class="text-base text-muted-foreground transition-colors hover:text-foreground"
              >
                {{ getBreadcrumbLabel(item) }}
              </NuxtLink>
              <span v-else class="text-base text-foreground">
                {{ getBreadcrumbLabel(item) }}
              </span>

              <ChevronRight
                v-if="index < breadcrumbItems.length - 1"
                class="size-4 shrink-0 text-muted-foreground"
              />
            </template>
          </div>
        </div>

        <div ref="profileMenuRef" class="relative">
          <Button
            variant="ghost"
            class="h-10 rounded-full px-2 pr-3 cursor-pointer"
            @click="isProfileMenuOpen = !isProfileMenuOpen"
          >
            <span
              class="flex size-8 items-center justify-center rounded-full bg-brand/20 text-xs font-semibold text-brand/80"
            >
              {{ profileInitials }}
            </span>
            <ChevronDown
              class="size-4 text-muted-foreground transition-transform"
              :class="isProfileMenuOpen ? 'rotate-180' : ''"
            />
          </Button>

          <div
            v-if="isProfileMenuOpen"
            class="absolute right-0 top-full z-20 mt-2 w-64 rounded-xl border bg-background p-3 shadow-lg"
          >
            <div class="mb-3 border-b pb-3">
              <p class="text-sm font-semibold text-foreground">
                {{ adminName }}
              </p>
              <p class="text-xs text-muted-foreground">{{ adminEmail }}</p>
            </div>

            <Button
              variant="outline"
              class="w-full justify-start cursor-pointer"
              @click.prevent="handleLogout"
            >
              <Icon name="lucide:log-out" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main class="p-4">
        <slot />
      </main>
    </SidebarInset>
  </SidebarProvider>
</template>
