import { useAuthStore } from "~/features/auth/store/auth.store";

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  const auth = useAuthStore();

  const api = $fetch.create({
    baseURL: config.public.apiBase,

    onRequest({ options }) {
      const headers = new Headers(options.headers || {});

      if (auth.accessToken) {
        headers.set("Authorization", `Bearer ${auth.accessToken}`);
      }

      options.headers = headers;
    },

    onResponseError({ request, response }) {
      const requestPath =
        typeof request === "string"
          ? request
          : request instanceof Request
            ? request.url
            : "";

      const isAuthRequest =
        requestPath.includes("/auth/login") ||
        requestPath.includes("/auth/register");

      if (response.status === 401 && auth.accessToken && !isAuthRequest) {
        auth.logout();
      }
    },
  });
  return { provide: { api } };
});
