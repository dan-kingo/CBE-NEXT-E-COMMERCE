<script setup lang="ts">
import type { CreatePlanRequest, SubscriptionPlan } from "~/types/admin";
import { subscriptionPlanService } from "~/services/subscriptionPlan.service";
import { subscriptionPlanSchema } from "~/validations/admin.schema";

definePageMeta({
    layout: "dashboard",
});

const toast = useToast();
const { getMessageFromUnknown } = useApiError();

const isSubmitting = ref(false);
const createdPlans = ref<SubscriptionPlan[]>([]);

const form = reactive<CreatePlanRequest>({
    code: "",
    name: "",
    price: 0,
    currency: "USD",
    durationDays: 30,
});

const createPlan = async () => {
    const parsed = subscriptionPlanSchema.safeParse(form);
    if (!parsed.success) {
        toast.error({ message: parsed.error.issues[0]?.message || "Invalid plan data" });
        return;
    }

    isSubmitting.value = true;
    try {
        const created = await subscriptionPlanService.create(parsed.data);
        createdPlans.value = [created, ...createdPlans.value];
        toast.success({ message: "Subscription plan created" });

        form.code = "";
        form.name = "";
        form.price = 0;
        form.currency = "USD";
        form.durationDays = 30;
    } catch (error) {
        toast.error({ message: getMessageFromUnknown(error) });
    } finally {
        isSubmitting.value = false;
    }
};
</script>

<template>
    <section class="space-y-6">
        <div>
            <h1 class="text-2xl font-semibold">Subscription Plans</h1>
            <p class="text-sm text-muted-foreground">
                API currently supports creating subscription plans. Additional plan CRUD actions will be added after
                backend endpoints are exposed.
            </p>
        </div>

        <div class="grid gap-4 lg:grid-cols-3">
            <Card class="lg:col-span-1 px-6">
                <div class="space-y-4">
                    <h2 class="text-lg font-medium">Create Plan</h2>

                    <div class="space-y-2">
                        <Label for="plan-code">Code</Label>
                        <Input id="plan-code" v-model="form.code" placeholder="BASIC_MONTHLY" />
                    </div>

                    <div class="space-y-2">
                        <Label for="plan-name">Name</Label>
                        <Input id="plan-name" v-model="form.name" placeholder="Basic Monthly" />
                    </div>

                    <div class="space-y-2">
                        <Label for="plan-price">Price</Label>
                        <Input id="plan-price" v-model="form.price" type="number" placeholder="9.99" />
                    </div>

                    <div class="space-y-2">
                        <Label for="plan-currency">Currency</Label>
                        <Input id="plan-currency" v-model="form.currency" placeholder="USD" />
                    </div>

                    <div class="space-y-2">
                        <Label for="plan-duration">Duration (days)</Label>
                        <Input id="plan-duration" v-model="form.durationDays" type="number" placeholder="30" />
                    </div>

                    <Button class="w-full" :disabled="isSubmitting" @click="createPlan">
                        {{ isSubmitting ? "Creating..." : "Create Plan" }}
                    </Button>
                </div>
            </Card>

            <Card class="lg:col-span-2 px-6">
                <div class="space-y-4">
                    <div class="flex items-center justify-between">
                        <h2 class="text-lg font-medium">Created in Session</h2>
                        <Badge variant="outline">Create Available</Badge>
                    </div>

                    <div class="overflow-x-auto">
                        <table class="w-full border-collapse text-sm">
                            <thead>
                                <tr class="border-b text-left">
                                    <th class="py-2">Code</th>
                                    <th class="py-2">Name</th>
                                    <th class="py-2">Price</th>
                                    <th class="py-2">Duration</th>
                                    <th class="py-2">Active</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="plan in createdPlans" :key="plan.id" class="border-b">
                                    <td class="py-2">{{ plan.code }}</td>
                                    <td class="py-2">{{ plan.name }}</td>
                                    <td class="py-2">{{ plan.price }} {{ plan.currency }}</td>
                                    <td class="py-2">{{ plan.durationDays }} days</td>
                                    <td class="py-2">
                                        <Badge :variant="plan.active ? 'outline' : 'secondary'">
                                            {{ plan.active ? "Active" : "Inactive" }}
                                        </Badge>
                                    </td>
                                </tr>
                                <tr v-if="!createdPlans.length">
                                    <td colspan="5" class="py-4 text-center text-muted-foreground">
                                        No plans created in this session yet.
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </Card>
        </div>
    </section>
</template>
