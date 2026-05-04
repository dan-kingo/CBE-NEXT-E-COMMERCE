import { defineStore } from "pinia";
import {
  createEmptyPagination,
  DEFAULT_PAGE_SIZE,
} from "~/services/pagination";
import { subscriptionService } from "~/features/subscription/services/subscription.service";
import {
  createSubscriptionPlanSchema,
  updateSubscriptionPlanSchema,
  type CreateSubscriptionPlanInput,
  type UpdateSubscriptionPlanInput,
} from "~/features/subscription/schemas/subscription.schema";
import type {
  CreatePlanRequest,
  SubscriptionPlanQueryRequest,
  SubscriptionPlanStats,
  SubscriptionPlan,
  UpdatePlanRequest,
} from "~/features/subscription/types/subscription.types";

type SubscriptionPlanForm = CreatePlanRequest & {
  active: boolean;
};

const createDefaultForm = (): SubscriptionPlanForm => ({
  name: "",
  price: 0,
  currency: "ETB",
  durationDays: 30,
  active: true,
});

type SubscriptionPlanListFilter = "all" | "active" | "inactive";

export const useSubscriptionStore = defineStore("subscription", {
  state: () => ({
    isLoading: false,
    isSubmitting: false,
    plans: [] as SubscriptionPlan[],
    pagination: createEmptyPagination(),
    statsByPlanId: {} as Record<string, SubscriptionPlanStats>,
    searchQuery: "",
    activeFilter: "all" as SubscriptionPlanListFilter,
    form: createDefaultForm(),
  }),

  actions: {
    resetForm(plan?: SubscriptionPlan | null) {
      this.form = plan
        ? {
            name: plan.name,
            price: plan.price,
            currency: plan.currency,
            durationDays: plan.durationDays,
            active: plan.active,
          }
        : createDefaultForm();
    },

    parseForm(): CreateSubscriptionPlanInput {
      const parsed = createSubscriptionPlanSchema.safeParse(this.form);
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message || "Invalid plan data");
      }

      return parsed.data;
    },

    parseUpdateForm(): UpdateSubscriptionPlanInput {
      const parsed = updateSubscriptionPlanSchema.safeParse(this.form);
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message || "Invalid plan data");
      }

      return parsed.data;
    },

    async loadPlans(options: SubscriptionPlanQueryRequest = {}) {
      const page = options.page ?? this.pagination.page;
      const size = options.size ?? (this.pagination.size || DEFAULT_PAGE_SIZE);
      const search = (options.search ?? this.searchQuery.trim()) || undefined;
      const active =
        options.active ??
        (this.activeFilter === "active"
          ? true
          : this.activeFilter === "inactive"
            ? false
            : undefined);

      this.isLoading = true;

      try {
        const result = await subscriptionService.getAll({
          page,
          size,
          search,
          active,
        });

        this.plans = result.content;
        this.pagination = result.pagination;
        return result;
      } finally {
        this.isLoading = false;
      }
    },

    async createPlan() {
      const payload = this.parseForm();
      this.isSubmitting = true;

      try {
        const created = await subscriptionService.create(payload);
        this.plans = [created, ...this.plans].slice(
          0,
          this.pagination.size || DEFAULT_PAGE_SIZE,
        );
        this.pagination = {
          ...this.pagination,
          totalElements: this.pagination.totalElements + 1,
          numberOfElements: Math.min(
            this.pagination.numberOfElements + 1,
            this.pagination.size || DEFAULT_PAGE_SIZE,
          ),
          totalPages: Math.max(
            1,
            Math.ceil(
              (this.pagination.totalElements + 1) /
                Math.max(this.pagination.size || DEFAULT_PAGE_SIZE, 1),
            ),
          ),
          empty: false,
        };
        this.resetForm();
        return created;
      } finally {
        this.isSubmitting = false;
      }
    },

    async updatePlan(id: string) {
      const payload = this.parseUpdateForm();
      this.isSubmitting = true;

      try {
        const updated = await subscriptionService.update(
          id,
          payload as UpdatePlanRequest,
        );
        this.plans = this.plans.map((plan) =>
          plan.id === id ? updated : plan,
        );
        if (this.statsByPlanId[id]) {
          this.statsByPlanId[id] = {
            ...this.statsByPlanId[id],
            id: updated.id,
            name: updated.name,
          };
        }
        return updated;
      } finally {
        this.isSubmitting = false;
      }
    },

    async togglePlanActive(id: string, active: boolean) {
      this.isSubmitting = true;

      try {
        const updated = await subscriptionService.update(id, { active });
        this.plans = this.plans.map((plan) =>
          plan.id === id ? updated : plan,
        );

        if (this.statsByPlanId[id]) {
          this.statsByPlanId[id] = {
            ...this.statsByPlanId[id],
            id: updated.id,
            name: updated.name,
          };
        }

        return updated;
      } finally {
        this.isSubmitting = false;
      }
    },

    async loadPlanStats(id: string) {
      const stats = await subscriptionService.getStats(id);
      this.statsByPlanId[id] = stats;
      return stats;
    },
  },
});
