import { useAuthStore } from "~/features/auth/store/auth.store";
export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path.startsWith("/dashboard")) {
    const auth = useAuthStore();

    if (!auth.accessToken) {
      return navigateTo("/");
    }

    if (auth.role) {
      if (auth.role !== "ADMIN") {
        auth.logout(false);

        if (import.meta.client) {
          const toast = useToast();
          toast.error({
            message: "Unauthorized access. Admin role is required.",
          });
        }

        return navigateTo("/");
      }

      return;
    }

    try {
      const profile = await auth.fetchProfile(true);

      if (!profile || profile.role !== "ADMIN") {
        auth.logout(false);

        if (import.meta.client) {
          const toast = useToast();
          toast.error({
            message: "Unauthorized access. Admin role is required.",
          });
        }

        return navigateTo("/");
      }
    } catch {
      auth.logout(false);
      return navigateTo("/");
    }
  }
});
