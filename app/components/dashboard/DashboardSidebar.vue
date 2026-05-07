<script setup lang="ts">
import { UserCircle2Icon } from 'lucide-vue-next';
import { useSidebar } from '~/components/ui/sidebar';
import { useAuth } from '~/features/auth';
import { getMenuItems } from '~/utils/constants'

const { fetchProfile, profile, role } = useAuth()

const profileInitials = computed(() => {
    const firstInitial = profile.value?.firstName?.charAt(0) ?? 'A'
    const lastInitial = profile.value?.lastName?.charAt(0) ?? 'O'

    return `${firstInitial}`
})

onMounted(async () => {
    await fetchProfile()
})

const route = useRoute()
const { isMobile, setOpenMobile } = useSidebar()
const menuItems = computed(() => getMenuItems(role.value ?? profile.value?.role ?? null))
const normalizePath = (path: string) =>
    path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path

const isActive = (to: string) => {
    const currentPath = normalizePath(route.path)
    const targetPath = normalizePath(to)

    // Keep the dashboard root active only on its exact route.
    if (targetPath === '/dashboard') {
        return currentPath === targetPath
    }

    return currentPath === targetPath || currentPath.startsWith(`${targetPath}/`)
}

const handleMenuNavigation = () => {
    if (isMobile.value) {
        setOpenMobile(false)
    }
}

</script>

<template>
    <Sidebar collapsible="icon" variant="sidebar"
        class="m-3 h-[calc(100vh-1.5rem)] rounded-3xl border border-border/70 bg-sidebar/95 p-2 text-sidebar-foreground shadow-sm backdrop-blur transition-colors duration-300 md:m-4 md:h-[calc(100vh-2rem)] md:p-3 dark:border-white/10 dark:bg-slate-950/90">
        <SidebarHeader class="border-b border-border/60 pb-3 dark:border-white/10">
            <div
                class="flex items-center gap-3 px-3 py-2.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
                <div
                    class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand font-semibold">
                    <UserCircle2Icon class="size-5" />
                </div>
                <div class="group-data-[collapsible=icon]:hidden">
                    <p class="text-2xl font-semibold leading-none text-brand">CBE NEXT</p>
                    <p class="mt-1 text-sm text-muted-foreground">Dashboard</p>
                </div>
            </div>
        </SidebarHeader>

        <SidebarContent class="pt-4">
            <SidebarGroup>
                <SidebarGroupContent>
                    <SidebarMenu class="gap-2.5">
                        <SidebarMenuItem v-for="item in menuItems" :key="item.title">
                            <SidebarMenuButton as-child :is-active="isActive(item.to)" :tooltip="item.title"
                                class="min-h-12 rounded-xl px-3 text-[16px] font-medium text-foreground/90 transition-all hover:bg-brand/10 hover:text-brand data-[active=true]:bg-brand/15 data-[active=true]:text-brand">
                                <NuxtLink :to="item.to" @click="handleMenuNavigation">
                                    <component :is="item.icon" class="size-5 shrink-0" />
                                    <span>{{ item.title }}</span>
                                </NuxtLink>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>
        </SidebarContent>

        <SidebarFooter class="border-t border-border/60 pt-3 dark:border-white/10">
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton class="group-data-[collapsible=icon]:justify-center min-h-12 rounded-xl px-3">

                        <div
                            class="size-10 shrink-0 rounded-full bg-brand/20 text-brand flex items-center justify-center text-base font-semibold">
                            {{ profileInitials }}
                        </div>
                        <div class="group-data-[collapsible=icon]:hidden text-left">
                            <p class="text-base font-medium leading-none text-sidebar-foreground">
                                {{ profile?.firstName || 'Admin' }} {{ profile?.lastName || 'One' }}
                            </p>
                            <p class="text-sm text-muted-foreground">{{ profile?.email || 'admin@example.com' }}</p>
                        </div>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarFooter>

        <SidebarRail />
    </Sidebar>
</template>