import { defineStore } from "pinia";
import { categoryService } from "~/services/category.service";
import { customerService } from "~/services/customer.service";
import { tenantService } from "~/services/tenant.service";
import type {
  CategoryResponse,
  CustomerResponse,
  UserResponse,
} from "~/types/admin";

export const useAdminDataStore = defineStore("adminData", {
  state: () => ({
    categories: [] as CategoryResponse[],
    tenants: [] as UserResponse[],
    customers: [] as CustomerResponse[],
    descendantsByCategoryId: {} as Record<string, number[]>,

    categoriesLoaded: false,
    tenantsLoaded: false,
    customersLoaded: false,

    isCategoriesLoading: false,
    isTenantsLoading: false,
    isCustomersLoading: false,
  }),

  actions: {
    async ensureCategories(force = false) {
      if (this.categoriesLoaded && !force) {
        return this.categories;
      }

      this.isCategoriesLoading = true;
      try {
        this.categories = await categoryService.getAll();
        this.categoriesLoaded = true;
        return this.categories;
      } finally {
        this.isCategoriesLoading = false;
      }
    },

    async revalidateCategories() {
      if (this.isCategoriesLoading) {
        return;
      }

      try {
        this.categories = await categoryService.getAll();
        this.categoriesLoaded = true;
      } catch {
        // Background refresh is best-effort and should not interrupt UX.
      }
    },

    async ensureTenants(force = false) {
      if (this.tenantsLoaded && !force) {
        return this.tenants;
      }

      this.isTenantsLoading = true;
      try {
        this.tenants = await tenantService.getAll();
        this.tenantsLoaded = true;
        return this.tenants;
      } finally {
        this.isTenantsLoading = false;
      }
    },

    async revalidateTenants() {
      if (this.isTenantsLoading) {
        return;
      }

      try {
        this.tenants = await tenantService.getAll();
        this.tenantsLoaded = true;
      } catch {
        // Background refresh is best-effort and should not interrupt UX.
      }
    },

    async ensureCustomers(force = false) {
      if (this.customersLoaded && !force) {
        return this.customers;
      }

      this.isCustomersLoading = true;
      try {
        this.customers = await customerService.getAll();
        this.customersLoaded = true;
        return this.customers;
      } finally {
        this.isCustomersLoading = false;
      }
    },

    async revalidateCustomers() {
      if (this.isCustomersLoading) {
        return;
      }

      try {
        this.customers = await customerService.getAll();
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
