import type { CategoryResponse, CreateCategoryRequest } from "~/types/admin";

export const categoryService = {
  async getAll() {
    const { $api } = useNuxtApp();
    return await $api<CategoryResponse[]>("/categories");
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
