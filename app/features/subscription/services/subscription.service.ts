import type {
  ApiStatus,
  CreatePlanRequest,
  SubscriptionPlanQueryRequest,
  SubscriptionPlanStats,
  SubscriptionPlan,
  UpdatePlanRequest,
} from "~/features/subscription/types/subscription.types";
import {
  DEFAULT_PAGE_SIZE,
  normalizePaginatedList,
} from "~/services/pagination";
import type { PaginatedApiResponse, PaginatedListResult } from "~/types/admin";

interface ApiResponse<T> {
  status: ApiStatus;
  data: T;
}

const isApiResponse = <T>(value: unknown): value is ApiResponse<T> => {
  if (!value || typeof value !== "object") {
    return false;
  }

  return "data" in (value as Record<string, unknown>);
};

const normalizePlanListResponse = (
  response:
    | PaginatedApiResponse<SubscriptionPlan>
    | ApiResponse<PaginatedApiResponse<SubscriptionPlan>>
    | SubscriptionPlan[],
  fallbackPage = 0,
  fallbackSize = DEFAULT_PAGE_SIZE,
): PaginatedListResult<SubscriptionPlan> => {
  if (Array.isArray(response)) {
    return normalizePaginatedList(response, fallbackPage, fallbackSize);
  }

  const payload = isApiResponse<PaginatedApiResponse<SubscriptionPlan>>(
    response,
  )
    ? response.data
    : response;

  return normalizePaginatedList(payload, fallbackPage, fallbackSize);
};

const normalizePlanResponse = (
  response: SubscriptionPlan | ApiResponse<SubscriptionPlan>,
) => {
  return isApiResponse<SubscriptionPlan>(response) ? response.data : response;
};

const normalizeStatsResponse = (
  response: SubscriptionPlanStats | ApiResponse<SubscriptionPlanStats>,
) => {
  return isApiResponse<SubscriptionPlanStats>(response)
    ? response.data
    : response;
};

export const subscriptionService = {
  async create(payload: CreatePlanRequest) {
    const { $api } = useNuxtApp();
    const response = await $api<
      SubscriptionPlan | ApiResponse<SubscriptionPlan>
    >("/admin/subscription-plans", {
      method: "POST",
      body: payload,
    });

    return normalizePlanResponse(response);
  },

  async getAll(params: SubscriptionPlanQueryRequest = {}) {
    const { $api } = useNuxtApp();
    const page = params.page ?? 0;
    const size = params.size ?? DEFAULT_PAGE_SIZE;

    const response = await $api<
      | PaginatedApiResponse<SubscriptionPlan>
      | ApiResponse<PaginatedApiResponse<SubscriptionPlan>>
      | SubscriptionPlan[]
    >("/admin/subscription-plans", {
      query: {
        page,
        size,
        search: params.search,
        active: params.active,
      },
    });

    return normalizePlanListResponse(response, page, size);
  },

  async update(id: string, payload: UpdatePlanRequest) {
    const { $api } = useNuxtApp();
    const response = await $api<
      SubscriptionPlan | ApiResponse<SubscriptionPlan>
    >(`/admin/subscription-plans/${id}`, {
      method: "PATCH",
      body: payload,
    });

    return normalizePlanResponse(response);
  },

  async getStats(id: string) {
    const { $api } = useNuxtApp();
    const response = await $api<
      SubscriptionPlanStats | ApiResponse<SubscriptionPlanStats>
    >(`/admin/subscription-plans/${id}/stats`);

    return normalizeStatsResponse(response);
  },
};
