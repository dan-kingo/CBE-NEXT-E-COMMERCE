import {
  DEFAULT_PAGE_SIZE,
  normalizePaginatedList,
} from "~/services/pagination";
import type {
  CustomerResponse,
  ListQueryParams,
  PaginatedApiResponse,
} from "~/types/admin";

export const customerService = {
  async getAll(params: ListQueryParams = {}) {
    const { $api } = useNuxtApp();
    const page = params.page ?? 0;
    const size = params.size ?? DEFAULT_PAGE_SIZE;

    const response = await $api<
      PaginatedApiResponse<CustomerResponse> | CustomerResponse[]
    >("/users/customers/getAll", {
      query: { page, size },
    });

    return normalizePaginatedList(response, page, size);
  },
};
