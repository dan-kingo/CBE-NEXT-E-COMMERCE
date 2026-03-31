<script setup lang="ts">
import { useAuth } from "~/composables/useAuth";
import { useAdminDataStore } from "~/stores/adminData.store";

const { logout } = useAuth();
const adminDataStore = useAdminDataStore();
const toast = useToast()
const handleLogout = async () => {
    try {
        logout()
        toast.success({ message: 'Logged out successfully!' })

    } catch (error: any) {
        const message = error?.data?.message || error?.data?.error || error?.message || 'Logout failed. Please try again.'
        console.error('Logout error:', error)
        toast.error({
            message: message
        })
    }
}

onMounted(() => {
    void adminDataStore.warmDashboardData();
});
</script>

<template>
    <SidebarProvider>
        <DashboardSidebar />

        <SidebarInset class="min-h-screen bg-gray-100 font-brand">
            <header
                class="sticky   top-0 z-10 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur justify-between">
                <SidebarTrigger class="cursor-pointer" />

                <div class="flex gap-4 items-center">
                    <p>Admin One</p>
                    <Badge class="bg-brand/15 text-brand/70" variant="outline">Admin</Badge>
                    <Button @click.prevent="handleLogout" variant="outline" size="icon" class="cursor-pointer">
                        <Icon name="lucide:log-out" />
                    </Button>
                </div>
            </header>

            <main class="p-4">
                <slot />
            </main>
        </SidebarInset>
    </SidebarProvider>
</template>