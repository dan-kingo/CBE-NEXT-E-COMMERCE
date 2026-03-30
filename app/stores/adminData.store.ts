import { defineStore } from "pinia";
import {
  createEmptyPagination,
  DEFAULT_PAGE_SIZE,
} from "~/services/pagination";
import { categoryService } from "~/services/category.service";
import { customerService } from "~/services/customer.service";
import { tenantService } from "~/services/tenant.service";
import type {
  CategoryResponse,
  CustomerResponse,
  ListQueryParams,
  PaginationMeta,
  UserResponse,
} from "~/types/admin";

interface ListLoadOptions extends ListQueryParams {
  force?: boolean;
}

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

export const useAdminDataStore = defineStore("adminData", {
  state: () => ({
    categories: [] as CategoryResponse[],
    tenants: [] as UserResponse[],
    customers: [] as CustomerResponse[],
    descendantsByCategoryId: {} as Record<string, number[]>,

    categoriesPagination: createEmptyPagination(0, DEFAULT_PAGE_SIZE),
    tenantsPagination: createEmptyPagination(0, DEFAULT_PAGE_SIZE),
    customersPagination: createEmptyPagination(0, DEFAULT_PAGE_SIZE),

    categoriesLoaded: false,
    tenantsLoaded: false,
    customersLoaded: false,

    isCategoriesLoading: false,
    isTenantsLoading: false,
    isCustomersLoading: false,
  }),

  actions: {
    async ensureCategories(options?: boolean | ListLoadOptions) {
      const { force, page, size } = normalizeListLoadOptions(
        options,
        this.categoriesPagination,
      );

      const canUseCache =
        this.categoriesLoaded &&
        !force &&
        this.categoriesPagination.page === page &&
        this.categoriesPagination.size === size;

      if (canUseCache) {
        return this.categories;
      }

      this.isCategoriesLoading = true;
      try {
        const result = await categoryService.getAll({ page, size });
        this.categories = result.content;
        this.categoriesPagination = result.pagination;
        this.categoriesLoaded = true;
        return this.categories;
      } finally {
        this.isCategoriesLoading = false;
      }
    },

    async revalidateCategories(options?: ListQueryParams) {
      if (this.isCategoriesLoading) {
        return;
      }

      const page = options?.page ?? this.categoriesPagination.page;
      const size = options?.size ?? this.categoriesPagination.size;

      try {
        const result = await categoryService.getAll({ page, size });
        this.categories = result.content;
        this.categoriesPagination = result.pagination;
        this.categoriesLoaded = true;
      } catch {
        // Background refresh is best-effort and should not interrupt UX.
      }
    },

    async ensureTenants(options?: boolean | ListLoadOptions) {
      const { force, page, size } = normalizeListLoadOptions(
        options,
        this.tenantsPagination,
      );

      const canUseCache =
        this.tenantsLoaded &&
        !force &&
        this.tenantsPagination.page === page &&
        this.tenantsPagination.size === size;

      if (canUseCache) {
        return this.tenants;
      }

      this.isTenantsLoading = true;
      try {
        const result = await tenantService.getAll({ page, size });
        this.tenants = result.content;
        this.tenantsPagination = result.pagination;
        this.tenantsLoaded = true;
        return this.tenants;
      } finally {
        this.isTenantsLoading = false;
      }
    },

    async revalidateTenants(options?: ListQueryParams) {
      if (this.isTenantsLoading) {
        return;
      }

      const page = options?.page ?? this.tenantsPagination.page;
      const size = options?.size ?? this.tenantsPagination.size;

      try {
        const result = await tenantService.getAll({ page, size });
        this.tenants = result.content;
        this.tenantsPagination = result.pagination;
        this.tenantsLoaded = true;
      } catch {
        // Background refresh is best-effort and should not interrupt UX.
      }
    },

    async ensureCustomers(options?: boolean | ListLoadOptions) {
      const { force, page, size } = normalizeListLoadOptions(
        options,
        this.customersPagination,
      );

      const canUseCache =
        this.customersLoaded &&
        !force &&
        this.customersPagination.page === page &&
        this.customersPagination.size === size;

      if (canUseCache) {
        return this.customers;
      }

      this.isCustomersLoading = true;
      try {
        const result = await customerService.getAll({ page, size });
        this.customers = result.content;
        this.customersPagination = result.pagination;
        this.customersLoaded = true;
        return this.customers;
      } finally {
        this.isCustomersLoading = false;
      }
    },

    async revalidateCustomers(options?: ListQueryParams) {
      if (this.isCustomersLoading) {
        return;
      }

      const page = options?.page ?? this.customersPagination.page;
      const size = options?.size ?? this.customersPagination.size;

      try {
        const result = await customerService.getAll({ page, size });
        this.customers = result.content;
        this.customersPagination = result.pagination;
        this.customersLoaded = true;
      } catch {
        // Background refresh is best-effort and should not interrupt UX.
      }
    },

    async ensureDescendants(categoryId: number, force = false) {
      const cacheKey = String(categoryId);
      const cached = this.descendantsByCategoryId[cacheKey];
      if (cached && !force) {
        return cached;
      }

      const descendants = await categoryService.getDescendantIds(categoryId);
      this.descendantsByCategoryId[cacheKey] = descendants;
      return descendants;
    },

    async revalidateDescendants(categoryId: number) {
      const cacheKey = String(categoryId);
      try {
        const descendants = await categoryService.getDescendantIds(categoryId);
        this.descendantsByCategoryId[cacheKey] = descendants;
      } catch {
        // Background refresh is best-effort and should not interrupt UX.
      }
    },

    upsertCategory(category: CategoryResponse) {
      const index = this.categories.findIndex(
        (item) => item.id === category.id,
      );
      if (index >= 0) {
        this.categories[index] = category;
      } else {
        this.categories = [category, ...this.categories];
      }
      this.categoriesLoaded = true;
    },

    removeCategory(categoryId: number) {
      this.categories = this.categories.filter(
        (item) => item.id !== categoryId,
      );
      delete this.descendantsByCategoryId[String(categoryId)];
    },

    prependTenant(tenant: UserResponse) {
      this.tenants = [tenant, ...this.tenants];
      this.tenantsLoaded = true;
    },

    invalidateCategories() {
      this.categoriesLoaded = false;
    },

    invalidateTenants() {
      this.tenantsLoaded = false;
    },

    invalidateCustomers() {
      this.customersLoaded = false;
    },
  },
});
