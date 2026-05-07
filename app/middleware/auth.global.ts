import { useAuthStore } from "~/features/auth/store/auth.store";

const DASHBOARD_ROLES = new Set(["ADMIN", "SUPERADMIN"]);
const MANAGE_ADMIN_ROUTE = "/dashboard/admin";

const denyDashboardAccess = (message: string) => {
  if (import.meta.client) {
    const toast = useToast();
    toast.error({ message });
  }
};

const isManageAdminRoute = (path: string) =>
  path === MANAGE_ADMIN_ROUTE || path.startsWith(`${MANAGE_ADMIN_ROUTE}/`);

export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path.startsWith("/dashboard")) {
    const auth = useAuthStore();

    if (!auth.accessToken) {
      return navigateTo("/");
    }

    if (auth.role) {
      if (!DASHBOARD_ROLES.has(auth.role)) {
        auth.logout(false);

        denyDashboardAccess(
          "Unauthorized access. Admin or SuperAdmin role is required.",
        );

        return navigateTo("/");
      }

      if (isManageAdminRoute(to.path) && auth.role === "ADMIN") {
        denyDashboardAccess(
          "Unauthorized access. SuperAdmin role is required.",
        );
        return navigateTo("/dashboard");
      }

      return;
    }

    try {
      const profile = await auth.fetchProfile(true);

      if (!profile || !DASHBOARD_ROLES.has(profile.role)) {
        auth.logout(false);

        denyDashboardAccess(
          "Unauthorized access. Admin or SuperAdmin role is required.",
        );

        return navigateTo("/");
      }

      if (isManageAdminRoute(to.path) && profile.role === "ADMIN") {
        denyDashboardAccess(
          "Unauthorized access. SuperAdmin role is required.",
        );
        return navigateTo("/dashboard");
      }
    } catch {
      auth.logout(false);
      return navigateTo("/");
    }
  }
});
