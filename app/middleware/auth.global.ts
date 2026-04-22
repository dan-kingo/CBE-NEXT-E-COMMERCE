import { useAuthStore } from "~/features/auth/store/auth.store";
export default defineNuxtRouteMiddleware((to) => {
  if (to.path.startsWith("/dashboard")) {
    const auth = useAuthStore();

    if (!auth.accessToken) {
      return navigateTo("/");
    }
  }
});
