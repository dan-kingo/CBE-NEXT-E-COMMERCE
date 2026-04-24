import { defineStore } from "pinia";
import { subscriptionService } from "~/features/subscription/services/subscription.service";
import {
  createSubscriptionPlanSchema,
  type CreateSubscriptionPlanInput,
} from "~/features/subscription/schemas/subscription.schema";
import type {
  CreatePlanRequest,
  SubscriptionPlan,
} from "~/features/subscription/types/subscription.types";

const createDefaultForm = (): CreatePlanRequest => ({
  code: "",
  name: "",
  price: 0,
  currency: "USD",
  durationDays: 30,
});

export const useSubscriptionStore = defineStore("subscription", {
  state: () => ({
    isSubmitting: false,
    createdPlans: [] as SubscriptionPlan[],
    form: createDefaultForm(),
  }),

  actions: {
    resetForm() {
      this.form = createDefaultForm();
    },

    parseForm(): CreateSubscriptionPlanInput {
      const parsed = createSubscriptionPlanSchema.safeParse(this.form);
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message || "Invalid plan data");
      }

      return parsed.data;
    },

    async createPlan() {
      const payload = this.parseForm();
      this.isSubmitting = true;

      try {
        const created = await subscriptionService.create(payload);
        this.createdPlans = [created, ...this.createdPlans];
        this.resetForm();
        return created;
      } finally {
        this.isSubmitting = false;
      }
    },
  },
});
