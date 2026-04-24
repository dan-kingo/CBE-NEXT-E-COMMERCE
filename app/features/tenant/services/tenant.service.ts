import { DEFAULT_PAGE_SIZE } from "~/services/pagination";
import type {
  CreateTenantRequest,
  ListQueryParams,
  PaginatedApiResponse,
  PaginatedListResult,
  UserResponse,
} from "~/features/tenant/types/tenant.types";

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
  response: PaginatedApiResponse<UserResponse> | UserResponse[],
  page: number,
  size: number,
): PaginatedListResult<UserResponse> => {
  if (Array.isArray(response)) {
    return {
      content: response,
      pagination: createFallbackPagination(page, size, response.length),
    };
  }

  return {
    content: response.data?.content ?? [],
    pagination:
      response.data?.pagination ??
      createFallbackPagination(page, size, response.data?.content?.length ?? 0),
  };
};

export const tenantService = {
  async create(payload: CreateTenantRequest) {
    const { $api } = useNuxtApp();
    return await $api<UserResponse>("/users/tenants/create", {
      method: "POST",
      body: payload,
    });
  },

  async getAll(params: ListQueryParams = {}) {
    const { $api } = useNuxtApp();
    const page = params.page ?? 0;
    const size = params.size ?? DEFAULT_PAGE_SIZE;

    const response = await $api<
      PaginatedApiResponse<UserResponse> | UserResponse[]
    >("/users/tenants/getAll", {
      query: { page, size },
    });

    return normalizeTenantList(response, page, size);
  },
};
