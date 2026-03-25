import type { CreateTenantRequest, UserResponse } from "~/types/admin";

export const tenantService = {
  async create(payload: CreateTenantRequest) {
    const { $api } = useNuxtApp();
    return await $api<UserResponse>("/users/tenants/create", {
      method: "POST",
      body: payload,
    });
  },

  async getAll() {
    const { $api } = useNuxtApp();
    return await $api<UserResponse[]>("/users/tenants/getAll");
  },
};
