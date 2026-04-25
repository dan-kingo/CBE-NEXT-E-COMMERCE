<script setup lang="ts">
import { UserCircle2Icon } from 'lucide-vue-next';
import { useSidebar } from '~/components/ui/sidebar';
import { useAuth } from '~/features/auth';
const { fetchProfile, profile } = useAuth()

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
    <Sidebar collapsible="icon" variant="sidebar" class="border-r">
        <SidebarHeader class="border-b">
            <div
                class="flex items-center gap-2 px-2 py-1.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
                <div
                    class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/20 text-primary-foreground font-semibold">
                    <UserCircle2Icon class="size-4" />
                </div>
                <div class="group-data-[collapsible=icon]:hidden">
                    <p class="text-sm font-semibold">E-COMMERCE</p>
                    <p class="text-xs text-muted-foreground">Dashboard</p>
                </div>
            </div>
        </SidebarHeader>

        <SidebarContent>
            <SidebarGroup>
                <SidebarGroupContent>
                    <SidebarMenu class="gap-3">
                        <SidebarMenuItem v-for="item in menuItems" :key="item.title">
                            <SidebarMenuButton as-child :is-active="isActive(item.to)" :tooltip="item.title"
                                class="text-[15px] hover:bg-brand/20 hover:text-brand/70 data-[active=true]:bg-brand/20 data-[active=true]:text-brand/70">
                                <NuxtLink :to="item.to" @click="handleMenuNavigation">
                                    <component :is="item.icon" class="size-4.5 shrink-0" />
                                    <span>{{ item.title }}</span>
                                </NuxtLink>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>
        </SidebarContent>

        <SidebarFooter class="border-t">
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton class="group-data-[collapsible=icon]:justify-center">

                        <div
                            class="size-9 shrink-0 rounded-full bg-brand/30 text-brand/70 flex items-center justify-center font-medium">
                            {{ profileInitials }}
                        </div>
                        <div class="group-data-[collapsible=icon]:hidden text-left">
                            <p class="text-sm font-medium leading-none">
                                {{ profile?.firstName || 'Admin' }} {{ profile?.lastName || 'One' }}
                            </p>
                            <p class="text-xs text-muted-foreground">{{ profile?.email || 'admin@example.com' }}</p>
                        </div>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarFooter>

        <SidebarRail />
    </Sidebar>
</template>