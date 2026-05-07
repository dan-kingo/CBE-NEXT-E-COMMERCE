import { DEFAULT_PAGE_SIZE } from "~/services/pagination";
import type {
  CreateUserRequest,
  UserResponse,
  ListQueryParams,
  PaginatedApiResponse,
  PaginatedListResult,
  ApiStatus,
} from "~/features/admin/types/admin.types";

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

const createFallbackPagination = (
  page: number,
  size: number,
  total: number,
) => ({
  page,
  size,
  totalElements: total,
  totalPages: total > 0 ? 1 : 0,
  numberOfElements: total,
  first: true,
  last: true,
  hasNext: false,
  hasPrevious: false,
  empty: total === 0,
});

const normalizeAdminList = (
  response:
    | PaginatedApiResponse<UserResponse>
    | {
        content: UserResponse[];
        pagination: PaginatedListResult<UserResponse>["pagination"];
      }
    | UserResponse[],
  page: number,
  size: number,
): PaginatedListResult<UserResponse> => {
  if (Array.isArray(response)) {
    return {
      content: response,
      pagination: createFallbackPagination(page, size, response.length),
    };
  }

  if ("data" in response && response.data) {
    return {
      content: response.data.content ?? [],
      pagination:
        response.data.pagination ??
        createFallbackPagination(page, size, response.data.content?.length ?? 0),
    };
  }

  if ("content" in response && Array.isArray(response.content)) {
    return {
      content: response.content,
      pagination:
        response.pagination ??
        createFallbackPagination(page, size, response.content.length),
    };
  }

  return {
    content: [],
    pagination: createFallbackPagination(page, size, 0),
  };
};

export const adminService = {
  async createAdmin(payload: CreateUserRequest) {
    const { $api } = useNuxtApp();

    return await $api<UserResponse>("/users/admins", {
      method: "POST",
      body: payload,
    });
  },

  async updateStatus(adminId: string, enabled: boolean) {
    const { $api } = useNuxtApp();
    const response = await $api<UserResponse | ApiResponse<UserResponse>>(
      `/users/admins/${adminId}/status`,
      {
        method: "PATCH",
        body: { enabled },
      },
    );

    return isApiResponse<UserResponse>(response) ? response.data : response;
  },

  async getAll(params: ListQueryParams = {}) {
    const { $api } = useNuxtApp();
    const page = params.page ?? 0;
    const size = params.size ?? DEFAULT_PAGE_SIZE;

    const response = await $api<
      | PaginatedApiResponse<UserResponse>
      | ApiResponse<PaginatedApiResponse<UserResponse>>
      | UserResponse[]
    >("/admins", {
      query: { page, size },
    });

    return normalizeAdminList(
      isApiResponse<PaginatedApiResponse<UserResponse>>(response)
        ? response.data
        : response,
      page,
      size,
    );
  },
};
