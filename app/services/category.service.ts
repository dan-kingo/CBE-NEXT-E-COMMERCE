import {
  DEFAULT_PAGE_SIZE,
  normalizePaginatedList,
} from "~/services/pagination";
import type {
  CategoryResponse,
  CreateCategoryRequest,
  ListQueryParams,
  PaginatedApiResponse,
} from "~/types/admin";

export const categoryService = {
  async getAll(params: ListQueryParams = {}) {
    const { $api } = useNuxtApp();
    const page = params.page ?? 0;
    const size = params.size ?? DEFAULT_PAGE_SIZE;

    const response = await $api<
      PaginatedApiResponse<CategoryResponse> | CategoryResponse[]
    >("/categories", {
      query: { page, size },
    });

    return normalizePaginatedList(response, page, size);
  },

  async getById(id: number) {
    const { $api } = useNuxtApp();
    return await $api<CategoryResponse>(`/categories/${id}`);
  },

  async create(payload: CreateCategoryRequest) {
    const { $api } = useNuxtApp();
    return await $api<CategoryResponse>("/categories", {
      method: "POST",
      body: payload,
    });
  },

  async update(id: number, payload: CreateCategoryRequest) {
    const { $api } = useNuxtApp();
    return await $api<CategoryResponse>(`/categories/${id}`, {
      method: "PUT",
      body: payload,
    });
  },

  async remove(id: number) {
    const { $api } = useNuxtApp();
    return await $api(`/categories/${id}`, {
      method: "DELETE",
    });
  },

  async getDescendantIds(id: number) {
    const { $api } = useNuxtApp();
    return await $api<number[]>(`/categories/${id}/descendants`);
  },
};
