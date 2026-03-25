<script setup lang="ts">
import { categoryService } from "~/services/category.service";
import { tenantService } from "~/services/tenant.service";

definePageMeta({
    layout: "dashboard",
});

const toast = useToast();
const { getMessageFromUnknown } = useApiError();

const categoryCount = ref(0);
const tenantCount = ref(0);

try {
    const [categories, tenants] = await Promise.all([
        categoryService.getAll(),
        tenantService.getAll(),
    ]);

    categoryCount.value = categories.length;
    tenantCount.value = tenants.length;
} catch (error) {
    toast.error({ message: getMessageFromUnknown(error) });
}
</script>

<template>
    <section class="space-y-6">
        <div>
            <h1 class="text-2xl font-semibold">Admin Dashboard</h1>
            <p class="text-sm text-muted-foreground">
                Quick visibility into currently implemented management modules.
            </p>
        </div>

        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card class="px-6">
                <div class="space-y-1">
                    <p class="text-sm text-muted-foreground">Categories</p>
                    <p class="text-2xl font-semibold">{{ categoryCount }}</p>
                </div>
            </Card>

            <Card class="px-6">
                <div class="space-y-1">
                    <p class="text-sm text-muted-foreground">Tenants</p>
                    <p class="text-2xl font-semibold">{{ tenantCount }}</p>
                </div>
            </Card>

            <Card class="px-6">
                <div class="space-y-1">
                    <p class="text-sm text-muted-foreground">Admin Bootstrap</p>
                    <p class="text-base font-medium">Ready</p>
                </div>
            </Card>

            <Card class="px-6">
                <div class="space-y-1">
                    <p class="text-sm text-muted-foreground">Plans</p>
                    <p class="text-base font-medium">Create flow ready</p>
                </div>
            </Card>
        </div>
    </section>
</template>