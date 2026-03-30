import {
  DEFAULT_PAGE_SIZE,
  normalizePaginatedList,
} from "~/services/pagination";
import type {
  CreateTenantRequest,
  ListQueryParams,
  PaginatedApiResponse,
  UserResponse,
} from "~/types/admin";

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

    return normalizePaginatedList(response, page, size);
  },
};
