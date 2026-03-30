<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useAdminDataStore } from "~/stores/adminData.store";

definePageMeta({
    layout: "dashboard",
});

const toast = useToast();
const { getMessageFromUnknown } = useApiError();
const adminDataStore = useAdminDataStore();
const {
    categoriesPagination,
    tenantsPagination,
    customersPagination,
    categoriesLoaded,
    tenantsLoaded,
    customersLoaded,
    isCategoriesLoading,
    isTenantsLoading,
    isCustomersLoading,
} = storeToRefs(adminDataStore);

const categoryCount = computed(() => categoriesPagination.value.totalElements);
const tenantCount = computed(() => tenantsPagination.value.totalElements);
const customerCount = computed(() => customersPagination.value.totalElements);
const isLoading = computed(() => {
    const hasAnyLoaded =
        categoriesLoaded.value || tenantsLoaded.value || customersLoaded.value;
    const anyLoading =
        isCategoriesLoading.value || isTenantsLoading.value || isCustomersLoading.value;

    return anyLoading && !hasAnyLoaded;
});

const loadDashboardMetrics = async () => {
    try {
        await Promise.all([
            adminDataStore.ensureCategories({ page: 0, size: 1 }),
            adminDataStore.ensureTenants({ page: 0, size: 1 }),
            adminDataStore.ensureCustomers({ page: 0, size: 1 }),
        ]);

        void Promise.all([
            adminDataStore.revalidateCategories({ page: 0, size: 1 }),
            adminDataStore.revalidateTenants({ page: 0, size: 1 }),
            adminDataStore.revalidateCustomers({ page: 0, size: 1 }),
        ]);
    } catch (error) {
        toast.error({ message: getMessageFromUnknown(error) });
    }
};

onMounted(() => {
    loadDashboardMetrics();
});
</script>

<template>
    <section class="space-y-6">
        <div>
            <h1 class="text-2xl font-semibold">Admin Dashboard</h1>
            <p class="text-sm text-muted-foreground">
                Quick manametric overview of key metrics and access points to manage categories, tenants, customers, and
                subscription plans.
            </p>
        </div>

        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card class="px-6">
                <div class="space-y-1">
                    <p class="text-sm text-muted-foreground">Categories</p>
                    <p class="text-2xl font-semibold">{{ isLoading ? "..." : categoryCount }}</p>
                </div>
            </Card>

            <Card class="px-6">
                <div class="space-y-1">
                    <p class="text-sm text-muted-foreground">Tenants</p>
                    <p class="text-2xl font-semibold">{{ isLoading ? "..." : tenantCount }}</p>
                </div>
            </Card>

            <Card class="px-6">
                <div class="space-y-1">
                    <p class="text-sm text-muted-foreground">Customers</p>
                    <p class="text-2xl font-semibold">{{ isLoading ? "..." : customerCount }}</p>
                </div>
            </Card>

            <Card class="px-6">
                <div class="space-y-1">
                    <p class="text-sm text-muted-foreground">Plans</p>
                    <p class="text-2xl font-semibold">0</p>
                </div>
            </Card>
        </div>
    </section>
</template>