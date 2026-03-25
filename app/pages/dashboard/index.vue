<script setup lang="ts">
import { categoryService } from "~/services/category.service";
import { customerService } from "~/services/customer.service";
import { tenantService } from "~/services/tenant.service";

definePageMeta({
    layout: "dashboard",
});

const toast = useToast();
const { getMessageFromUnknown } = useApiError();

const categoryCount = ref(0);
const tenantCount = ref(0);
const customerCount = ref(0);
const isLoading = ref(true);

const loadDashboardMetrics = async () => {
    isLoading.value = true;
    try {
        const [categories, tenants, customers] = await Promise.all([
            categoryService.getAll(),
            tenantService.getAll(),
            customerService.getAll(),
        ]);

        categoryCount.value = categories.length;
        tenantCount.value = tenants.length;
        customerCount.value = customers.length;
    } catch (error) {
        toast.error({ message: getMessageFromUnknown(error) });
    } finally {
        isLoading.value = false;
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