<script setup lang="ts">
import { storeToRefs } from "pinia";
import type { CreateTenantRequest, UserResponse } from "~/types/admin";
import { tenantService } from "~/services/tenant.service";
import { useAdminDataStore } from "~/stores/adminData.store";
import { tenantSchema } from "~/validations/admin.schema";

definePageMeta({
    layout: "dashboard",
});

const toast = useToast();
const { getMessageFromUnknown } = useApiError();
const adminDataStore = useAdminDataStore();
const { tenants, isTenantsLoading, tenantsLoaded } = storeToRefs(adminDataStore);

const isSubmitting = ref(false);
const isInitialLoading = computed(() => isTenantsLoading.value && !tenantsLoaded.value);

const form = reactive<CreateTenantRequest>({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phoneNumber: "",
});

const loadTenants = async (force = false) => {
    try {
        await adminDataStore.ensureTenants(force);

        if (tenantsLoaded.value) {
            void adminDataStore.revalidateTenants();
        }
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
        const created = await tenantService.create(parsed.data);
        adminDataStore.prependTenant(created);
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

onMounted(() => {
    loadTenants();
});
</script>

<template>
    <section class="space-y-6">
        <div>
            <h1 class="text-2xl font-semibold">Tenant Management</h1>
            <p class="text-sm text-muted-foreground">
                Current API supports tenant create and list. Edit/delete will be enabled when backend endpoints are
                available.
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

                    <Button class="w-full" :disabled="isSubmitting" @click="submitTenant">
                        {{ isSubmitting ? "Creating..." : "Create Tenant" }}
                    </Button>
                </div>
            </Card>

            <Card class="lg:col-span-2 px-6">
                <div class="space-y-4">
                    <div class="flex items-center justify-between">
                        <h2 class="text-lg font-medium">Tenant List</h2>
                        <Badge variant="outline">List + Create Available</Badge>
                    </div>

                    <div v-if="isInitialLoading" class="text-sm text-muted-foreground">Loading tenants...</div>

                    <div v-else class="overflow-x-auto">
                        <table class="w-full border-collapse text-sm">
                            <thead>
                                <tr class="border-b text-left">
                                    <th class="py-2">Email</th>
                                    <th class="py-2">Tenant ID</th>
                                    <th class="py-2">Name</th>
                                    <th class="py-2">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="tenant in tenants" :key="tenant.id" class="border-b">
                                    <td class="py-2">{{ tenant.email }}</td>
                                    <td class="py-2 text-muted-foreground">{{ tenant.tenantId || "-" }}</td>
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
                    </div>
                </div>
            </Card>
        </div>
    </section>
</template>
