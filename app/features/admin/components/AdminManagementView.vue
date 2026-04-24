<script setup lang="ts">
import { useAdminManagement } from "~/features/admin/composables/useAdminManagement";

const toast = useToast();
const { getMessageFromUnknown } = useApiError();
const { form, isSubmitting, createdAdmin, createAdmin } = useAdminManagement();

const submitAdmin = async () => {
    try {
        await createAdmin();
        toast.success({ message: "Admin account created successfully" });
    } catch (error) {
        const message = getMessageFromUnknown(error);
        toast.error({ message });
    }
};
</script>

<template>
    <section class="space-y-6">
        <div>
            <h1 class="text-2xl font-semibold">Admin Management</h1>
            <p class="text-sm text-muted-foreground">
                Create and manage admin accounts that can access the dashboard.
            </p>
        </div>

        <Card class="max-w-xl px-6">
            <div class="space-y-4">
                <h2 class="text-lg font-medium">Create Admin</h2>

                <div class="space-y-2">
                    <Label for="bootstrap-email">Email</Label>
                    <Input id="bootstrap-email" v-model="form.email" placeholder="admin@company.com" />
                </div>

                <div class="space-y-2">
                    <Label for="bootstrap-password">Password</Label>
                    <Input id="bootstrap-password" v-model="form.password" type="password"
                        placeholder="At least 8 chars" />
                </div>

                <p v-if="createdAdmin" class="text-sm text-muted-foreground">
                    Created admin: {{ createdAdmin.email }} (ID: {{ createdAdmin.id }},
                    Status: {{ createdAdmin.enabled ? "Enabled" : "Disabled" }})
                </p>

                <Button class="w-full cursor-pointer" :disabled="isSubmitting" @click="submitAdmin">
                    {{ isSubmitting ? "Creating..." : "Create Admin" }}
                </Button>
            </div>
        </Card>
    </section>
</template>
