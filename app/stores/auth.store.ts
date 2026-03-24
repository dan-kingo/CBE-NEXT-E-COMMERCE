import { defineStore } from "pinia";
import { authService } from "~/services/auth.service";
import type { LoginInput } from "~/validations/auth.schema";

export const useAuthStore = defineStore("auth", {
  state: () => {
    const accessTokenCookie = useCookie<string | null>("access_token", {
      default: () => null,
    });
    const refreshTokenCookie = useCookie<string | null>("refresh_token", {
      default: () => null,
    });

    return {
      accessToken: accessTokenCookie.value,
      refreshToken: refreshTokenCookie.value,
      isLoading: false,
    };
  },

  actions: {
    persistAuthState() {
      useCookie<string | null>("access_token").value = this.accessToken;
      useCookie<string | null>("refresh_token").value = this.refreshToken;
    },

    async applySession(data: any) {
      this.accessToken = data.accessToken;
      this.refreshToken = data.refreshToken;

      this.persistAuthState();
    },

    async login(payload: LoginInput) {
      this.isLoading = true;
      try {
        const res: any = await authService.login(payload);
        const session = res?.data ?? res;

        if (!session?.accessToken || !session?.refreshToken) {
          throw new Error("Login response does not include a session.");
        }

        await this.applySession(session);
      } finally {
        this.isLoading = false;
      }
    },

    logout() {
      this.accessToken = null;
      this.refreshToken = null;

      useCookie<string | null>("access_token").value = null;
      useCookie<string | null>("refresh_token").value = null;

      navigateTo("/login");
    },
  },
});
