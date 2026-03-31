<script setup lang="ts">
import { storeToRefs } from "pinia";
import type { CreateTenantRequest } from "~/types/admin";
import { DEFAULT_PAGE_SIZE } from "~/services/pagination";
import { tenantService } from "~/services/tenant.service";
import { useAdminDataStore } from "~/stores/adminData.store";
import { tenantSchema } from "~/validations/admin.schema";

definePageMeta({
    layout: "dashboard",
});

const toast = useToast();
const { getMessageFromUnknown } = useApiError();
const adminDataStore = useAdminDataStore();
const { tenants, isTenantsLoading, tenantsLoaded, tenantsPagination } =
    storeToRefs(adminDataStore);

const isSubmitting = ref(false);
const isInitialLoading = computed(() => isTenantsLoading.value && !tenantsLoaded.value);
const pageSummary = computed(() => {
    if (!tenantsPagination.value.totalElements) {
        return "No tenants";
    }

    const start = tenantsPagination.value.page * tenantsPagination.value.size + 1;
    const end = start + tenantsPagination.value.numberOfElements - 1;
    return `Showing ${start}-${end} of ${tenantsPagination.value.totalElements}`;
});

const form = reactive<CreateTenantRequest>({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phoneNumber: "",
});

const loadTenants = async (page = tenantsPagination.value.page, force = false) => {
    const size = tenantsPagination.value.size > 1
        ? tenantsPagination.value.size
        : DEFAULT_PAGE_SIZE;

    try {
        await adminDataStore.ensureTenants({
            force,
            page,
            size,
        });
    } catch (error) {
        toast.error({ message: getMessageFromUnknown(error) });
    }
};

const submitTenant = async () => {
    const parsed = tenantSchema.safeParse(form);
    if (!parsed.success) {
        toast.error({ message: parsed.error.issues[0]?.message || "Invalid tenant data" });
        return;
    }

    isSubmitting.value = true;
    try {
        const createdTenant = await tenantService.create(parsed.data);

        if (tenantsPagination.value.page === 0) {
            adminDataStore.prependTenant(createdTenant);
        } else {
            adminDataStore.invalidateTenants();
        }

        toast.success({ message: "Tenant created successfully" });

        form.email = "";
        form.password = "";
        form.firstName = "";
        form.lastName = "";
        form.phoneNumber = "";
    } catch (error) {
        toast.error({ message: getMessageFromUnknown(error) });
    } finally {
        isSubmitting.value = false;
    }
};

const goToPreviousPage = async () => {
    if (!tenantsPagination.value.hasPrevious || isTenantsLoading.value) {
        return;
    }

    await loadTenants(tenantsPagination.value.page - 1);
};

const goToNextPage = async () => {
    if (!tenantsPagination.value.hasNext || isTenantsLoading.value) {
        return;
    }

    await loadTenants(tenantsPagination.value.page + 1);
};

onMounted(() => {
    loadTenants(tenantsLoaded.value ? tenantsPagination.value.page : 0);
});
</script>

<template>
    <section class="space-y-6">
        <div>
            <h1 class="text-2xl font-semibold">Tenant Management</h1>
            <p class="text-sm text-muted-foreground">
                create and manage tenant accounts that can access the dashboard.
            </p>
        </div>

        <div class="grid gap-4 lg:grid-cols-3">
            <Card class="lg:col-span-1 px-6">
                <div class="space-y-4">
                    <h2 class="text-lg font-medium">Create Tenant</h2>

                    <div class="space-y-2">
                        <Label for="tenant-email">Email</Label>
                        <Input id="tenant-email" v-model="form.email" placeholder="tenant@example.com" />
                    </div>

                    <div class="space-y-2">
                        <Label for="tenant-password">Password</Label>
                        <Input id="tenant-password" v-model="form.password" type="password"
                            placeholder="At least 8 chars" />
                    </div>

                    <div class="space-y-2">
                        <Label for="tenant-first-name">First Name</Label>
                        <Input id="tenant-first-name" v-model="form.firstName" placeholder="John" />
                    </div>

                    <div class="space-y-2">
                        <Label for="tenant-last-name">Last Name</Label>
                        <Input id="tenant-last-name" v-model="form.lastName" placeholder="Doe" />
                    </div>

                    <div class="space-y-2">
                        <Label for="tenant-phone">Phone Number</Label>
                        <Input id="tenant-phone" v-model="form.phoneNumber" placeholder="+2519xxxxxxx" />
                    </div>

                    <Button class="w-full cursor-pointer" :disabled="isSubmitting" @click="submitTenant">
                        {{ isSubmitting ? "Creating..." : "Create Tenant" }}
                    </Button>
                </div>
            </Card>

            <Card class="lg:col-span-2 px-6">
                <div class="space-y-4">
                    <div class="flex items-center justify-between">
                        <h2 class="text-lg font-medium">Tenant List</h2>

                    </div>

                    <div v-if="isInitialLoading" class="text-sm text-muted-foreground">Loading tenants...</div>

                    <div v-else class="overflow-x-auto">
                        <table class="w-full border-collapse text-sm">
                            <thead>
                                <tr class="border-b text-left">
                                    <th class="py-2">Email</th>
                                    <th class="py-2">Name</th>
                                    <th class="py-2">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="tenant in tenants" :key="tenant.id" class="border-b">
                                    <td class="py-2">{{ tenant.email }}</td>
                                    <td class="py-2">{{ [tenant.tenantFirstName,
                                    tenant.tenantLastName].filter(Boolean).join(" ") || "-" }}</td>
                                    <td class="py-2">
                                        <Badge :variant="tenant.enabled ? 'outline' : 'destructive'">
                                            {{ tenant.enabled ? "Enabled" : "Disabled" }}
                                        </Badge>
                                    </td>
                                </tr>
                                <tr v-if="!tenants.length">
                                    <td colspan="4" class="py-4 text-center text-muted-foreground">No tenants yet.</td>
                                </tr>
                            </tbody>
                        </table>

                        <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
                            <p class="text-xs text-muted-foreground">{{ pageSummary }}</p>
                            <div class="flex items-center gap-2">
                                <Button class="cursor-pointer" size="sm" variant="outline"
                                    :disabled="!tenantsPagination.hasPrevious || isTenantsLoading"
                                    @click="goToPreviousPage">
                                    Previous
                                </Button>
                                <p class="text-xs text-muted-foreground">
                                    Page {{ tenantsPagination.page + 1 }} of
                                    {{ Math.max(tenantsPagination.totalPages, 1) }}
                                </p>
                                <Button class="cursor-pointer" size="sm" variant="outline"
                                    :disabled="!tenantsPagination.hasNext || isTenantsLoading" @click="goToNextPage">
                                    Next
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    </section>
</template>
