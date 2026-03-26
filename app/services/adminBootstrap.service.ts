import type { CreateUserRequest, UserResponse } from "~/types/admin";

export const adminBootstrapService = {
  async createAdmin(payload: CreateUserRequest) {
    const { $api } = useNuxtApp();

    return await $api<UserResponse>("/users/admins", {
      method: "POST",
      body: payload,
    });
  },
};
