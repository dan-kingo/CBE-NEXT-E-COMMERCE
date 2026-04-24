import type {
  CreatePlanRequest,
  SubscriptionPlan,
} from "~/features/subscription/types/subscription.types";

export const subscriptionService = {
  async create(payload: CreatePlanRequest) {
    const { $api } = useNuxtApp();
    return await $api<SubscriptionPlan>("/admin/subscription-plans", {
      method: "POST",
      body: payload,
    });
  },

  async getAll() {
    const { $api } = useNuxtApp();
    return await $api<SubscriptionPlan[]>("/admin/subscription-plans");
  },
};
