<script setup lang="ts">
import type { RegisterRequest } from "~/types/admin";
import { adminBootstrapService } from "~/services/adminBootstrap.service";
import { useBootstrapStore } from "~/stores/bootstrap.store";
import { bootstrapSchema } from "~/validations/admin.schema";

definePageMeta({
    layout: "dashboard",
});

const toast = useToast();
const { getMessageFromUnknown } = useApiError();
const authStore = useAuthStore();
const bootstrapStore = useBootstrapStore();

const form = reactive({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phoneNumber: "",
    bootstrapKey: "",
});

const runBootstrap = async () => {
    const parsed = bootstrapSchema.safeParse({
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        phoneNumber: form.phoneNumber,
    });

    if (!parsed.success) {
        toast.error({ message: parsed.error.issues[0]?.message || "Invalid bootstrap payload" });
        return;
    }

    bootstrapStore.start();

    try {
        const payload: RegisterRequest = {
            ...parsed.data,
            role: "ADMIN",
        };

        const authResponse = await adminBootstrapService.bootstrap(
            payload,
            form.bootstrapKey || undefined,
        );

        await authStore.applySession(authResponse);
        bootstrapStore.markSuccess();
        toast.success({ message: "Admin bootstrap completed and session initialized" });
    } catch (error) {
        const message = getMessageFromUnknown(error);
        bootstrapStore.markFailure(message);
        toast.error({ message });
    }
};
</script>

<template>
    <section class="space-y-6">
        <div>
            <h1 class="text-2xl font-semibold">Admin Bootstrap</h1>
            <p class="text-sm text-muted-foreground">
                One-time setup flow to create the first super admin account.
            </p>
        </div>

        <Card class="max-w-2xl px-6">
            <div class="space-y-4">
                <div class="flex items-center justify-between">
                    <h2 class="text-lg font-medium">Bootstrap Admin</h2>
                    <Badge :variant="bootstrapStore.isBootstrapped ? 'outline' : 'secondary'">
                        {{ bootstrapStore.isBootstrapped ? "Bootstrapped" : "Not bootstrapped" }}
                    </Badge>
                </div>

                <div class="space-y-2">
                    <Label for="bootstrap-email">Email</Label>
                    <Input id="bootstrap-email" v-model="form.email" placeholder="admin@company.com" />
                </div>

                <div class="grid gap-4 sm:grid-cols-2">
                    <div class="space-y-2">
                        <Label for="bootstrap-first">First Name</Label>
                        <Input id="bootstrap-first" v-model="form.firstName" placeholder="Admin" />
                    </div>
                    <div class="space-y-2">
                        <Label for="bootstrap-last">Last Name</Label>
                        <Input id="bootstrap-last" v-model="form.lastName" placeholder="User" />
                    </div>
                </div>

                <div class="space-y-2">
                    <Label for="bootstrap-phone">Phone Number</Label>
                    <Input id="bootstrap-phone" v-model="form.phoneNumber" placeholder="+2519xxxxxxx" />
                </div>

                <div class="space-y-2">
                    <Label for="bootstrap-password">Password</Label>
                    <Input id="bootstrap-password" v-model="form.password" type="password"
                        placeholder="At least 8 chars" />
                </div>

                <div class="space-y-2">
                    <Label for="bootstrap-key">Bootstrap Header Key (optional)</Label>
                    <Input id="bootstrap-key" v-model="form.bootstrapKey" placeholder="X-Admin-Bootstrap value" />
                </div>

                <p v-if="bootstrapStore.lastError" class="text-sm text-red-600">
                    {{ bootstrapStore.lastError }}
                </p>

                <Button class="w-full" :disabled="bootstrapStore.isPending" @click="runBootstrap">
                    {{ bootstrapStore.isPending ? "Bootstrapping..." : "Run Admin Bootstrap" }}
                </Button>
            </div>
        </Card>
    </section>
</template>
