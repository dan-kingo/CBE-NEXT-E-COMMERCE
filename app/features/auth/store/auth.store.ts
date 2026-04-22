import { defineStore } from "pinia";
import { authService } from "~/features/auth/services/auth.service";
import type { LoginInput } from "~/features/auth/schemas/auth.schema";
import type {
  AuthProfile,
  AuthSession,
  AuthStateData,
} from "~/features/auth/types/auth.types";

const PROFILE_CACHE_TTL = 60_000;

export const useAuthStore = defineStore("auth", {
  state: () => {
    const accessTokenCookie = useCookie<string | null>("access_token", {
      default: () => null,
    });
    const refreshTokenCookie = useCookie<string | null>("refresh_token", {
      default: () => null,
    });

    const session =
      accessTokenCookie.value && refreshTokenCookie.value
        ? {
            accessToken: accessTokenCookie.value,
            refreshToken: refreshTokenCookie.value,
          }
        : null;

    return {
      data: {
        session,
        profile: null,
      } as AuthStateData,
      lastFetched: null as number | null,
      isFetching: false,
      loginRequest: null as Promise<AuthSession> | null,
      profileRequest: null as Promise<AuthProfile | null> | null,
    };
  },

  getters: {
    accessToken: (state) => state.data.session?.accessToken ?? null,
    refreshToken: (state) => state.data.session?.refreshToken ?? null,
    profile: (state) => state.data.profile,
    isAuthenticated: (state) => Boolean(state.data.session?.accessToken),
    hasFreshProfile: (state) => {
      if (!state.lastFetched) {
        return false;
      }

      return Date.now() - state.lastFetched < PROFILE_CACHE_TTL;
    },
  },

  actions: {
    persistAuthState() {
      useCookie<string | null>("access_token").value = this.accessToken;
      useCookie<string | null>("refresh_token").value = this.refreshToken;
    },

    invalidate() {
      this.lastFetched = null;
    },

    applySession(session: AuthSession) {
      this.data.session = session;
      this.persistAuthState();
      this.invalidate();
    },

    async login(payload: LoginInput) {
      if (this.loginRequest) {
        return await this.loginRequest;
      }

      this.isFetching = true;
      const request = authService
        .login(payload)
        .then((session) => {
          this.applySession(session);
          return session;
        })
        .finally(() => {
          this.loginRequest = null;
          this.isFetching = false;
        });

      this.loginRequest = request;
      return await request;
    },

    async fetchProfile(force = false) {
      if (!this.data.session) {
        return null;
      }

      if (!force && this.data.profile && this.hasFreshProfile) {
        return this.data.profile;
      }

      if (this.profileRequest) {
        return await this.profileRequest;
      }

      this.isFetching = true;
      const request = authService
        .getMe()
        .then((profile) => {
          this.data.profile = profile;
          this.lastFetched = Date.now();
          return profile;
        })
        .finally(() => {
          this.profileRequest = null;
          this.isFetching = false;
        });

      this.profileRequest = request;
      return await request;
    },

    logout(redirect = true) {
      this.data.session = null;
      this.data.profile = null;
      this.lastFetched = null;

      useCookie<string | null>("access_token").value = null;
      useCookie<string | null>("refresh_token").value = null;

      if (redirect) {
        void navigateTo("/");
      }
    },
  },
});
