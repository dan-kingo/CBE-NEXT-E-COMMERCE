<script setup lang="ts">
import { UserCircle2Icon } from 'lucide-vue-next';
import { useSidebar } from '~/components/ui/sidebar';

const route = useRoute()
const { isMobile, setOpenMobile } = useSidebar()

const isActive = (to: string) =>
    route.path === to || route.path.startsWith(`${to}/`)

const handleMenuNavigation = () => {
    if (isMobile.value) {
        setOpenMobile(false)
    }
}

</script>

<template>
    <Sidebar collapsible="icon" variant="sidebar" class="border-r">
        <SidebarHeader class="border-b">
            <div class="flex items-center gap-2 px-2 py-1.5">
                <div
                    class="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/20 text-primary-foreground font-semibold">
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
                    <SidebarMenu>
                        <SidebarMenuItem v-for="item in menuItems" :key="item.title">
                            <SidebarMenuButton as-child :is-active="isActive(item.to)" :tooltip="item.title" class="hover:bg-brand/20 hover:text-brand/70   router-link-active:bg-brand/20
         router-link-active:text-brand">
                                <NuxtLink :to="item.to" @click="handleMenuNavigation">
                                    <component :is="item.icon" class="size-4  " />
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
                    <SidebarMenuButton>

                        <div
                            class="size-8 rounded-full bg-brand/30 text-brand/70 flex items-center justify-center font-medium">
                            A
                        </div>
                        <div class="group-data-[collapsible=icon]:hidden text-left">
                            <p class="text-sm font-medium leading-none">Admin One</p>
                            <p class="text-xs text-muted-foreground">admin@gmail.com</p>
                        </div>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarFooter>

        <SidebarRail />
    </Sidebar>
</template>