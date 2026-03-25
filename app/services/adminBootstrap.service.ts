import type { AuthResponse, RegisterRequest } from "~/types/admin";

export const adminBootstrapService = {
  async bootstrap(payload: RegisterRequest, bootstrapKey?: string) {
    const { $api } = useNuxtApp();

    return await $api<AuthResponse>("/public/admin/bootstrap", {
      method: "POST",
      headers: bootstrapKey
        ? {
            "X-Admin-Bootstrap": bootstrapKey,
          }
        : undefined,
      body: payload,
    });
  },
};
