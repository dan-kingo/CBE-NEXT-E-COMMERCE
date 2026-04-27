import { defineStore } from "pinia";
import { DEFAULT_PAGE_SIZE } from "~/services/pagination";
import { adminService } from "~/features/admin/services/admin.service";
import type {
  ListQueryParams,
  PaginatedListResult,
  PaginationMeta,
  UserResponse,
} from "~/features/admin/types/admin.types";

interface ListLoadOptions extends ListQueryParams {
  force?: boolean;
}

interface CachedPage<T> extends PaginatedListResult<T> {
  fetchedAt: number;
}

const getCacheKey = (page: number, size: number) => `${page}:${size}`;

const inFlightAdminPages = new Map<
  string,
  Promise<PaginatedListResult<UserResponse>>
>();

const createEmptyPagination = (
  page = 0,
  size = DEFAULT_PAGE_SIZE,
): PaginationMeta => ({
  page,
  size,
  totalElements: 0,
  totalPages: 0,
  numberOfElements: 0,
  first: true,
  last: true,
  hasNext: false,
  hasPrevious: false,
  empty: true,
});

const normalizeListLoadOptions = (
  value: boolean | ListLoadOptions | undefined,
  currentPagination: PaginationMeta,
) => {
  if (typeof value === "boolean") {
    return {
      force: value,
      page: currentPagination.page,
      size: currentPagination.size,
    };
  }

  return {
    force: value?.force ?? false,
    page: value?.page ?? currentPagination.page,
    size: value?.size ?? currentPagination.size,
  };
};

export const useAdminStore = defineStore("admin", {
  state: () => ({
    admins: [] as UserResponse[],
    pagination: createEmptyPagination(0, DEFAULT_PAGE_SIZE),
    pageCache: {} as Record<string, CachedPage<UserResponse>>,
    loaded: false,
    isLoading: false,
  }),

  actions: {
    setFromCache(page: CachedPage<UserResponse>) {
      this.admins = [...page.content];
      this.pagination = { ...page.pagination };
      this.loaded = true;
    },

    cachePage(result: PaginatedListResult<UserResponse>) {
      this.pageCache[
        getCacheKey(result.pagination.page, result.pagination.size)
      ] = {
        ...result,
        content: [...result.content],
        pagination: { ...result.pagination },
        fetchedAt: Date.now(),
      };
    },

    async ensureAdmins(options?: boolean | ListLoadOptions) {
      const { force, page, size } = normalizeListLoadOptions(
        options,
        this.pagination,
      );
      const cacheKey = getCacheKey(page, size);
      const cachedPage = this.pageCache[cacheKey];
      const pending = inFlightAdminPages.get(cacheKey);

      const canUseCurrentState =
        this.loaded &&
        !force &&
        this.pagination.page === page &&
        this.pagination.size === size;

      if (canUseCurrentState) {
        return this.admins;
      }

      if (cachedPage && !force) {
        this.setFromCache(cachedPage);
        return this.admins;
      }

      if (pending) {
        const result = await pending;
        this.admins = result.content;
        this.pagination = result.pagination;
        this.loaded = true;
        this.cachePage(result);
        return this.admins;
      }

      this.isLoading = true;
      const request = adminService.getAll({ page, size });
      inFlightAdminPages.set(cacheKey, request);

      try {
        const result = await request;
        this.admins = result.content;
        this.pagination = result.pagination;
        this.loaded = true;
        this.cachePage(result);
        return this.admins;
      } finally {
        inFlightAdminPages.delete(cacheKey);
        this.isLoading = false;
      }
    },

    async revalidateAdmins(options?: ListQueryParams) {
      if (this.isLoading) {
        return;
      }

      const page = options?.page ?? this.pagination.page;
      const size = options?.size ?? this.pagination.size;

      try {
        const result = await adminService.getAll({ page, size });
        this.admins = result.content;
        this.pagination = result.pagination;
        this.loaded = true;
        this.cachePage(result);
      } catch {
        // Background refresh should not break current UX state.
      }
    },

    prependAdmin(admin: UserResponse) {
      const nextAdmins = [admin, ...this.admins].slice(
        0,
        this.pagination.size,
      );
      this.admins = nextAdmins;
      this.pagination = {
        ...this.pagination,
        totalElements: this.pagination.totalElements + 1,
        numberOfElements: nextAdmins.length,
        totalPages: Math.max(
          1,
          Math.ceil(
            (this.pagination.totalElements + 1) /
              Math.max(this.pagination.size, 1),
          ),
        ),
        empty: false,
      };
      this.loaded = true;

      const cacheKey = getCacheKey(this.pagination.page, this.pagination.size);
      const cached = this.pageCache[cacheKey];
      if (!cached) {
        return;
      }

      const nextContent = [admin, ...cached.content].slice(
        0,
        cached.pagination.size,
      );
      const nextTotalElements = cached.pagination.totalElements + 1;
      this.pageCache[cacheKey] = {
        ...cached,
        content: nextContent,
        pagination: {
          ...cached.pagination,
          totalElements: nextTotalElements,
          numberOfElements: nextContent.length,
          totalPages: Math.max(
            1,
            Math.ceil(nextTotalElements / Math.max(cached.pagination.size, 1)),
          ),
          empty: false,
        },
      };
    },

    patchAdmin(updated: UserResponse) {
      this.admins = this.admins.map((admin) =>
        admin.id === updated.id ? { ...admin, ...updated } : admin,
      );

      const currentKey = getCacheKey(
        this.pagination.page,
        this.pagination.size,
      );
      const currentCached = this.pageCache[currentKey];
      if (currentCached) {
        this.pageCache[currentKey] = {
          ...currentCached,
          content: currentCached.content.map((admin) =>
            admin.id === updated.id ? { ...admin, ...updated } : admin,
          ),
        };
      }
    },

    async updateAdminStatus(adminId: string, enabled: boolean) {
      const updated = await adminService.updateStatus(adminId, enabled);
      this.patchAdmin(updated);
      return updated;
    },

    invalidateAdmins() {
      this.loaded = false;
      this.pageCache = {};
    },
  },
});
