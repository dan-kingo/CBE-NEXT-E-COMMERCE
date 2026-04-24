import type {
  CreateUserRequest,
  UserResponse,
} from "~/features/admin/types/admin.types";

export const adminService = {
  async createAdmin(payload: CreateUserRequest) {
    const { $api } = useNuxtApp();

    return await $api<UserResponse>("/users/admins", {
      method: "POST",
      body: payload,
    });
  },
};
