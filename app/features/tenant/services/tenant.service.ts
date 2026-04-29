import { DEFAULT_PAGE_SIZE } from "~/services/pagination";
import type {
  ApiStatus,
  CreateTenantRequest,
  ListQueryParams,
  PaginatedApiResponse,
  PaginatedListResult,
  TenantProfileStatus,
  UserResponse,
} from "~/features/tenant/types/tenant.types";

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

const createFallbackPagination = (
  page: number,
  size: number,
  total: number,
) => ({
  page,
  size,
  totalElements: total,
  totalPages: total > 0 ? 1 : 0,
  numberOfElements: total,
  first: true,
  last: true,
  hasNext: false,
  hasPrevious: false,
  empty: total === 0,
});

const normalizeTenantList = (
  response:
    | PaginatedApiResponse<UserResponse>
    | {
        content: UserResponse[];
        pagination: PaginatedListResult<UserResponse>["pagination"];
      }
    | UserResponse[],
  page: number,
  size: number,
): PaginatedListResult<UserResponse> => {
  if (Array.isArray(response)) {
    return {
      content: response,
      pagination: createFallbackPagination(page, size, response.length),
    };
  }

  if ("content" in response && Array.isArray(response.content)) {
    return {
      content: response.content,
      pagination:
        response.pagination ??
        createFallbackPagination(page, size, response.content.length),
    };
  }

  if ("data" in response) {
    const apiResponse = response as PaginatedApiResponse<UserResponse>;
    return {
      content: apiResponse.data?.content ?? [],
      pagination:
        apiResponse.data?.pagination ??
        createFallbackPagination(
          page,
          size,
          apiResponse.data?.content?.length ?? 0,
        ),
    };
  }

  return {
    content: [],
    pagination: createFallbackPagination(page, size, 0),
  };
};

export const tenantService = {
  async create(payload: CreateTenantRequest) {
    const { $api } = useNuxtApp();
    const response = await $api<UserResponse | ApiResponse<UserResponse>>(
      "/users/tenants/create",
      {
        method: "POST",
        body: payload,
      },
    );

    return isApiResponse<UserResponse>(response) ? response.data : response;
  },

  async updateStatus(profileId: string, status: TenantProfileStatus) {
    const { $api } = useNuxtApp();
    const response = await $api<UserResponse | ApiResponse<UserResponse>>(
      `/admin/tenants/${profileId}/status`,
      {
        method: "PUT",
        query: { status },
      },
    );

    return isApiResponse<UserResponse>(response) ? response.data : response;
  },

  async getAll(params: ListQueryParams = {}) {
    const { $api } = useNuxtApp();
    const page = params.page ?? 0;
    const size = params.size ?? DEFAULT_PAGE_SIZE;

    const response = await $api<
      | PaginatedApiResponse<UserResponse>
      | ApiResponse<PaginatedApiResponse<UserResponse>>
      | UserResponse[]
    >("/users/tenants/getAll", {
      query: { page, size },
    });

    return normalizeTenantList(
      isApiResponse<PaginatedApiResponse<UserResponse>>(response)
        ? response.data
        : response,
      page,
      size,
    );
  },
};
