import type { ApiStatus } from "~/types/admin";
import type { AdminOverviewResponse } from "~/types/dashboard";

interface ApiResponse<T> {
  status: ApiStatus;
  data: T;
}

const isApiResponse = <T>(value: unknown): value is ApiResponse<T> => {
  if (!value || typeof value !== "object") {
    return false;
  }

  return "data" in (value as Record<string, unknown>);
};

const normalizeOverviewResponse = (
  response: AdminOverviewResponse | ApiResponse<AdminOverviewResponse>,
) => {
  return isApiResponse<AdminOverviewResponse>(response)
    ? response.data
    : response;
};

export const adminStatisticsService = {
  async getOverview() {
    const { $api } = useNuxtApp();
    const response = await $api<
      AdminOverviewResponse | ApiResponse<AdminOverviewResponse>
    >("/admin/statistics/overview");

    return normalizeOverviewResponse(response);
  },
};
