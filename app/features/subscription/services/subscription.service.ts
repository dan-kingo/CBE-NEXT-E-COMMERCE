import type {
  CreatePlanRequest,
  AssignTenantSubscriptionRequest,
  SubscriptionPlan,
  SubscriptionPlanQueryRequest,
  SubscriptionPlanStats,
  UpdatePlanRequest,
} from "~/features/subscription/types/subscription.types";
import {
  DEFAULT_PAGE_SIZE,
  normalizePaginatedList,
} from "~/services/pagination";
import type {
  ApiStatus,
  PaginatedApiResponse,
  PaginatedListResult,
} from "~/types/admin";
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
    | SubscriptionPlan[]
    | unknown,
  fallbackPage = 0,
  fallbackSize = DEFAULT_PAGE_SIZE,
): PaginatedListResult<SubscriptionPlan> => {
  if (Array.isArray(response)) {
    return normalizePaginatedList(response, fallbackPage, fallbackSize);
  }

  const asAny = response as Record<string, unknown> | undefined;

  // Case: direct PaginatedApiResponse<T> -> { status, data: { content, pagination } }
  if (
    asAny &&
    asAny.data &&
    typeof asAny.data === "object" &&
    Array.isArray((asAny.data as any).content) &&
    (asAny.data as any).pagination
  ) {
    return normalizePaginatedList(
      response as PaginatedApiResponse<SubscriptionPlan>,
      fallbackPage,
      fallbackSize,
    );
  }

  // Case: double-wrapped ApiResponse<PaginatedApiResponse<T>> -> { status, data: { status, data: { content, pagination } } }
  if (
    asAny &&
    asAny.data &&
    typeof asAny.data === "object" &&
    (asAny.data as any).data &&
    Array.isArray((asAny.data as any).data.content) &&
    (asAny.data as any).data.pagination
  ) {
    return normalizePaginatedList(
      asAny.data as any as PaginatedApiResponse<SubscriptionPlan>,
      fallbackPage,
      fallbackSize,
    );
  }

  // Case: payload is already the inner paginated data { content, pagination }
  if (
    asAny &&
    Array.isArray((asAny as any).content) &&
    (asAny as any).pagination
  ) {
    return normalizePaginatedList(
      {
        status: { code: 200, message: "OK" },
        data: asAny as any,
      } as PaginatedApiResponse<SubscriptionPlan>,
      fallbackPage,
      fallbackSize,
    );
  }

  return normalizePaginatedList([], fallbackPage, fallbackSize);
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
    >("/subscription-plans", {
      method: "POST",
      body: payload,
    });

    return normalizePlanResponse(response);
  },

  async assignToTenant(
    tenantId: string,
    payload: AssignTenantSubscriptionRequest,
  ) {
    const { $api } = useNuxtApp();
    await $api<void>(`/admin/tenants/${tenantId}/subscription`, {
      method: "POST",
      body: payload,
    });
  },

  async getAll(params: SubscriptionPlanQueryRequest = {}) {
    const { $api } = useNuxtApp();
    const page = params.page ?? 0;
    const size = params.size ?? DEFAULT_PAGE_SIZE;

    const response = await $api<
      | PaginatedApiResponse<SubscriptionPlan>
      | ApiResponse<PaginatedApiResponse<SubscriptionPlan>>
      | SubscriptionPlan[]
    >("/subscription-plans", {
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
    >(`/subscription-plans/${id}`, {
      method: "PATCH",
      body: payload,
    });

    return normalizePlanResponse(response);
  },

  async getStats(id: string) {
    const { $api } = useNuxtApp();
    const response = await $api<
      SubscriptionPlanStats | ApiResponse<SubscriptionPlanStats>
    >(`/subscription-plans/${id}/stats`);

    return normalizeStatsResponse(response);
  },
};
