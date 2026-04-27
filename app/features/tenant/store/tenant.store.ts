import { defineStore } from "pinia";
import { DEFAULT_PAGE_SIZE } from "~/services/pagination";
import { tenantService } from "~/features/tenant/services/tenant.service";
import type {
  ListQueryParams,
  PaginatedListResult,
  PaginationMeta,
  TenantProfileStatus,
  UserResponse,
} from "~/features/tenant/types/tenant.types";

interface ListLoadOptions extends ListQueryParams {
  force?: boolean;
}

interface CachedPage<T> extends PaginatedListResult<T> {
  fetchedAt: number;
}

const getCacheKey = (page: number, size: number) => `${page}:${size}`;

const inFlightTenantPages = new Map<
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

export const useTenantStore = defineStore("tenant", {
  state: () => ({
    tenants: [] as UserResponse[],
    pagination: createEmptyPagination(0, DEFAULT_PAGE_SIZE),
    pageCache: {} as Record<string, CachedPage<UserResponse>>,
    loaded: false,
    isLoading: false,
  }),

  actions: {
    setFromCache(page: CachedPage<UserResponse>) {
      this.tenants = [...page.content];
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

    async ensureTenants(options?: boolean | ListLoadOptions) {
      const { force, page, size } = normalizeListLoadOptions(
        options,
        this.pagination,
      );
      const cacheKey = getCacheKey(page, size);
      const cachedPage = this.pageCache[cacheKey];
      const pending = inFlightTenantPages.get(cacheKey);

      const canUseCurrentState =
        this.loaded &&
        !force &&
        this.pagination.page === page &&
        this.pagination.size === size;

      if (canUseCurrentState) {
        return this.tenants;
      }

      if (cachedPage && !force) {
        this.setFromCache(cachedPage);
        return this.tenants;
      }

      if (pending) {
        const result = await pending;
        this.tenants = result.content;
        this.pagination = result.pagination;
        this.loaded = true;
        this.cachePage(result);
        return this.tenants;
      }

      this.isLoading = true;
      const request = tenantService.getAll({ page, size });
      inFlightTenantPages.set(cacheKey, request);

      try {
        const result = await request;
        this.tenants = result.content;
        this.pagination = result.pagination;
        this.loaded = true;
        this.cachePage(result);
        return this.tenants;
      } finally {
        inFlightTenantPages.delete(cacheKey);
        this.isLoading = false;
      }
    },

    async revalidateTenants(options?: ListQueryParams) {
      if (this.isLoading) {
        return;
      }

      const page = options?.page ?? this.pagination.page;
      const size = options?.size ?? this.pagination.size;

      try {
        const result = await tenantService.getAll({ page, size });
        this.tenants = result.content;
        this.pagination = result.pagination;
        this.loaded = true;
        this.cachePage(result);
      } catch {
        // Background refresh should not break current UX state.
      }
    },

    prependTenant(tenant: UserResponse) {
      const nextTenants = [tenant, ...this.tenants].slice(
        0,
        this.pagination.size,
      );
      this.tenants = nextTenants;
      this.pagination = {
        ...this.pagination,
        totalElements: this.pagination.totalElements + 1,
        numberOfElements: nextTenants.length,
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

      const nextContent = [tenant, ...cached.content].slice(
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

    patchTenant(updated: UserResponse) {
      this.tenants = this.tenants.map((tenant) =>
        tenant.id === updated.id ? { ...tenant, ...updated } : tenant,
      );

      const currentKey = getCacheKey(
        this.pagination.page,
        this.pagination.size,
      );
      const currentCached = this.pageCache[currentKey];
      if (currentCached) {
        this.pageCache[currentKey] = {
          ...currentCached,
          content: currentCached.content.map((tenant) =>
            tenant.id === updated.id ? { ...tenant, ...updated } : tenant,
          ),
        };
      }
    },

    async updateTenantStatus(
      tenantProfileId: number,
      status: TenantProfileStatus,
    ) {
      const updated = await tenantService.updateStatus(tenantProfileId, status);
      this.patchTenant(updated);
      return updated;
    },

    invalidateTenants() {
      this.loaded = false;
      this.pageCache = {};
    },
  },
});
