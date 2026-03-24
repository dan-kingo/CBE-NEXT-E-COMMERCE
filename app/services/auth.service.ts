import type { LoginInput, RegisterInput } from "~/validations/auth.schema";
import type { ProfileData } from "~/utils/constants";

export const authService = {
  async login(payload: LoginInput) {
    const { $api } = useNuxtApp();
    return await $api("/auth/login", {
      method: "POST",
      body: payload,
    });
  },

  async register(payload: RegisterInput) {
    const { $api } = useNuxtApp();
    return await $api("/auth/register", {
      method: "POST",
      body: payload,
    });
  },

  async getMe() {
    const { $api } = useNuxtApp();
    return await $api<{ profile: ProfileData }>("/profile/me");
  },
};
