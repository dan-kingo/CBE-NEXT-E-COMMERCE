import type { CreatePlanRequest, SubscriptionPlan } from "~/types/admin";

export const subscriptionPlanService = {
  async create(payload: CreatePlanRequest) {
    const { $api } = useNuxtApp();
    return await $api<SubscriptionPlan>("/admin/subscription-plans", {
      method: "POST",
      body: payload,
    });
  },
};
