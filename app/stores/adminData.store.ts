import { defineStore } from "pinia";
import {
  createEmptyPagination,
  DEFAULT_PAGE_SIZE,
} from "~/services/pagination";
import { categoryService } from "~/services/category.service";
import { customerService } from "~/services/customer.service";
import { tenantService } from "~/services/tenant.service";
import { templateService } from "~/services/template.service";
import type {
  CategoryResponse,
  CustomerResponse,
  ListQueryParams,
  PaginatedListResult,
  PaginationMeta,
  CreateCategoryRequest,
  TemplateResponse,
  UserResponse,
} from "~/types/admin";

interface ListLoadOptions extends ListQueryParams {
  force?: boolean;
}

interface TemplateListLoadOptions extends ListLoadOptions {
  tenantId?: string;
}

interface CachedPage<T> extends PaginatedListResult<T> {
  fetchedAt: number;
}

const getCacheKey = (page: number, size: number) => `${page}:${size}`;
const getTemplateCacheKey = (tenantId: string, page: number, size: number) =>
  `${tenantId}:${page}:${size}`;

const inFlightCategoryPages = new Map<
  string,
  Promise<PaginatedListResult<CategoryResponse>>
>();
const inFlightTenantPages = new Map<
  string,
  Promise<PaginatedListResult<UserResponse>>
>();
const inFlightCustomerPages = new Map<
  string,
  Promise<PaginatedListResult<CustomerResponse>>
>();
const inFlightTemplatePages = new Map<
  string,
  Promise<PaginatedListResult<TemplateResponse>>
>();

const cloneCategory = (category: CategoryResponse): CategoryResponse => ({
  ...category,
  children: category.children.map(cloneCategory),
});

const cloneCategoryTree = (categories: CategoryResponse[]) =>
  categories.map(cloneCategory);

const buildDescendantsIndex = (categories: CategoryResponse[]) => {
  const index: Record<string, number[]> = {};

  const visit = (category: CategoryResponse): number[] => {
    const descendants: number[] = [];
    for (const child of category.children) {
      descendants.push(child.id);
      descendants.push(...visit(child));
    }

    index[String(category.id)] = descendants;
    return descendants;
  };

  for (const category of categories) {
    visit(category);
  }

  return index;
};

const updateCategoryInTree = (
  categories: CategoryResponse[],
  categoryId: number,
  updater: (category: CategoryResponse) => CategoryResponse,
) => {
  let updated = false;

  const next = categories.map((category) => {
    let candidate = category;

    if (candidate.id === categoryId) {
      candidate = updater(candidate);
      updated = true;
    }

    if (candidate.children.length) {
      const childResult = updateCategoryInTree(
        candidate.children,
        categoryId,
        updater,
      );
      if (childResult.updated) {
        candidate = {
          ...candidate,
          children: childResult.categories,
        };
        updated = true;
      }
    }

    return candidate;
  });

  return { categories: next, updated };
};

const removeCategoryFromTree = (
  categories: CategoryResponse[],
  categoryId: number,
) => {
  let updated = false;

  const next: CategoryResponse[] = [];
  for (const category of categories) {
    if (category.id === categoryId) {
      updated = true;
      continue;
    }

    let candidate = category;
    if (candidate.children.length) {
      const childResult = removeCategoryFromTree(
        candidate.children,
        categoryId,
      );
      if (childResult.updated) {
        candidate = {
          ...candidate,
          children: childResult.categories,
        };
        updated = true;
      }
    }

    next.push(candidate);
  }

  return { categories: next, updated };
};

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

const normalizeTemplateListLoadOptions = (
  value: boolean | TemplateListLoadOptions | undefined,
  currentPagination: PaginationMeta,
  currentTenantId: string,
) => {
  const normalized = normalizeListLoadOptions(value, currentPagination);
  const tenantId =
    typeof value === "object" && value?.tenantId !== undefined
      ? value.tenantId
      : currentTenantId;

  return {
    ...normalized,
    tenantId,
  };
};

export const useAdminDataStore = defineStore("adminData", {
  state: () => ({
    categories: [] as CategoryResponse[],
    tenants: [] as UserResponse[],
    customers: [] as CustomerResponse[],
    templates: [] as TemplateResponse[],
    descendantsByCategoryId: {} as Record<string, number[]>,

    categoriesPagination: createEmptyPagination(0, DEFAULT_PAGE_SIZE),
    tenantsPagination: createEmptyPagination(0, DEFAULT_PAGE_SIZE),
    customersPagination: createEmptyPagination(0, DEFAULT_PAGE_SIZE),
    templatesPagination: createEmptyPagination(0, DEFAULT_PAGE_SIZE),

    categoriesPageCache: {} as Record<string, CachedPage<CategoryResponse>>,
    tenantsPageCache: {} as Record<string, CachedPage<UserResponse>>,
    customersPageCache: {} as Record<string, CachedPage<CustomerResponse>>,
    templatesPageCache: {} as Record<string, CachedPage<TemplateResponse>>,

    categoriesLoaded: false,
    tenantsLoaded: false,
    customersLoaded: false,
    templatesLoaded: false,

    isCategoriesLoading: false,
    isTenantsLoading: false,
    isCustomersLoading: false,
    isTemplatesLoading: false,

    currentTemplateTenantId: "",
  }),

  actions: {
    async warmDashboardData() {
      const size = DEFAULT_PAGE_SIZE;

      await Promise.allSettled([
        this.ensureCategories({ page: 0, size }),
        this.ensureTenants({ page: 0, size }),
        this.ensureCustomers({ page: 0, size }),
      ]);
    },

    setCategoriesFromCache(page: CachedPage<CategoryResponse>) {
      this.categories = cloneCategoryTree(page.content);
      this.categoriesPagination = { ...page.pagination };
      this.descendantsByCategoryId = buildDescendantsIndex(this.categories);
      this.categoriesLoaded = true;
    },

    setTenantsFromCache(page: CachedPage<UserResponse>) {
      this.tenants = [...page.content];
      this.tenantsPagination = { ...page.pagination };
      this.tenantsLoaded = true;
    },

    setCustomersFromCache(page: CachedPage<CustomerResponse>) {
      this.customers = [...page.content];
      this.customersPagination = { ...page.pagination };
      this.customersLoaded = true;
    },

    setTemplatesFromCache(
      page: CachedPage<TemplateResponse>,
      tenantId: string,
    ) {
      this.templates = [...page.content];
      this.templatesPagination = { ...page.pagination };
      this.templatesLoaded = true;
      this.currentTemplateTenantId = tenantId;
    },

    cacheCategoriesPage(result: PaginatedListResult<CategoryResponse>) {
      this.categoriesPageCache[
        getCacheKey(result.pagination.page, result.pagination.size)
      ] = {
        ...result,
        content: cloneCategoryTree(result.content),
        pagination: { ...result.pagination },
        fetchedAt: Date.now(),
      };
    },

    cacheTenantsPage(result: PaginatedListResult<UserResponse>) {
      this.tenantsPageCache[
        getCacheKey(result.pagination.page, result.pagination.size)
      ] = {
        ...result,
        content: [...result.content],
        pagination: { ...result.pagination },
        fetchedAt: Date.now(),
      };
    },

    cacheCustomersPage(result: PaginatedListResult<CustomerResponse>) {
      this.customersPageCache[
        getCacheKey(result.pagination.page, result.pagination.size)
      ] = {
        ...result,
        content: [...result.content],
        pagination: { ...result.pagination },
        fetchedAt: Date.now(),
      };
    },

    cacheTemplatesPage(
      result: PaginatedListResult<TemplateResponse>,
      tenantId: string,
    ) {
      this.templatesPageCache[
        getTemplateCacheKey(
          tenantId,
          result.pagination.page,
          result.pagination.size,
        )
      ] = {
        ...result,
        content: [...result.content],
        pagination: { ...result.pagination },
        fetchedAt: Date.now(),
      };
    },

    updateCategoriesAcrossCache(
      apply: (content: CategoryResponse[]) => CategoryResponse[],
    ) {
      const current = apply(this.categories);
      if (current !== this.categories) {
        this.categories = current;
      }

      for (const key of Object.keys(this.categoriesPageCache)) {
        const cached = this.categoriesPageCache[key];
        if (!cached) {
          continue;
        }

        const nextContent = apply(cached.content);
        if (nextContent !== cached.content) {
          this.categoriesPageCache[key] = {
            ...cached,
            content: cloneCategoryTree(nextContent),
          };
        }
      }
    },

    async ensureCategories(options?: boolean | ListLoadOptions) {
      const { force, page, size } = normalizeListLoadOptions(
        options,
        this.categoriesPagination,
      );
      const cacheKey = getCacheKey(page, size);
      const cachedPage = this.categoriesPageCache[cacheKey];
      const pending = inFlightCategoryPages.get(cacheKey);

      const canUseCurrentState =
        this.categoriesLoaded &&
        !force &&
        this.categoriesPagination.page === page &&
        this.categoriesPagination.size === size;

      if (canUseCurrentState) {
        return this.categories;
      }

      if (cachedPage && !force) {
        this.setCategoriesFromCache(cachedPage);
        return this.categories;
      }

      if (pending) {
        const result = await pending;
        this.categories = result.content;
        this.categoriesPagination = result.pagination;
        this.descendantsByCategoryId = buildDescendantsIndex(this.categories);
        this.categoriesLoaded = true;
        this.cacheCategoriesPage(result);
        return this.categories;
      }

      this.isCategoriesLoading = true;
      const request = categoryService.getAll({ page, size });
      inFlightCategoryPages.set(cacheKey, request);
      try {
        const result = await request;
        this.categories = result.content;
        this.categoriesPagination = result.pagination;
        this.descendantsByCategoryId = buildDescendantsIndex(this.categories);
        this.categoriesLoaded = true;
        this.cacheCategoriesPage(result);
        return this.categories;
      } finally {
        inFlightCategoryPages.delete(cacheKey);
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
        this.descendantsByCategoryId = buildDescendantsIndex(this.categories);
        this.categoriesLoaded = true;
        this.cacheCategoriesPage(result);
      } catch {
        // Background refresh is best-effort and should not interrupt UX.
      }
    },

    async ensureTenants(options?: boolean | ListLoadOptions) {
      const { force, page, size } = normalizeListLoadOptions(
        options,
        this.tenantsPagination,
      );
      const cacheKey = getCacheKey(page, size);
      const cachedPage = this.tenantsPageCache[cacheKey];
      const pending = inFlightTenantPages.get(cacheKey);

      const canUseCurrentState =
        this.tenantsLoaded &&
        !force &&
        this.tenantsPagination.page === page &&
        this.tenantsPagination.size === size;

      if (canUseCurrentState) {
        return this.tenants;
      }

      if (cachedPage && !force) {
        this.setTenantsFromCache(cachedPage);
        return this.tenants;
      }

      if (pending) {
        const result = await pending;
        this.tenants = result.content;
        this.tenantsPagination = result.pagination;
        this.tenantsLoaded = true;
        this.cacheTenantsPage(result);
        return this.tenants;
      }

      this.isTenantsLoading = true;
      const request = tenantService.getAll({ page, size });
      inFlightTenantPages.set(cacheKey, request);
      try {
        const result = await request;
        this.tenants = result.content;
        this.tenantsPagination = result.pagination;
        this.tenantsLoaded = true;
        this.cacheTenantsPage(result);
        return this.tenants;
      } finally {
        inFlightTenantPages.delete(cacheKey);
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
        this.cacheTenantsPage(result);
      } catch {
        // Background refresh is best-effort and should not interrupt UX.
      }
    },

    async ensureCustomers(options?: boolean | ListLoadOptions) {
      const { force, page, size } = normalizeListLoadOptions(
        options,
        this.customersPagination,
      );
      const cacheKey = getCacheKey(page, size);
      const cachedPage = this.customersPageCache[cacheKey];
      const pending = inFlightCustomerPages.get(cacheKey);

      const canUseCurrentState =
        this.customersLoaded &&
        !force &&
        this.customersPagination.page === page &&
        this.customersPagination.size === size;

      if (canUseCurrentState) {
        return this.customers;
      }

      if (cachedPage && !force) {
        this.setCustomersFromCache(cachedPage);
        return this.customers;
      }

      if (pending) {
        const result = await pending;
        this.customers = result.content;
        this.customersPagination = result.pagination;
        this.customersLoaded = true;
        this.cacheCustomersPage(result);
        return this.customers;
      }

      this.isCustomersLoading = true;
      const request = customerService.getAll({ page, size });
      inFlightCustomerPages.set(cacheKey, request);
      try {
        const result = await request;
        this.customers = result.content;
        this.customersPagination = result.pagination;
        this.customersLoaded = true;
        this.cacheCustomersPage(result);
        return this.customers;
      } finally {
        inFlightCustomerPages.delete(cacheKey);
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
        this.cacheCustomersPage(result);
      } catch {
        // Background refresh is best-effort and should not interrupt UX.
      }
    },

    async ensureTemplates(options?: boolean | TemplateListLoadOptions) {
      const { force, page, size, tenantId } = normalizeTemplateListLoadOptions(
        options,
        this.templatesPagination,
        this.currentTemplateTenantId,
      );
      const resolvedTenantId = tenantId || "";
      const cacheKey = getTemplateCacheKey(resolvedTenantId, page, size);
      const cachedPage = this.templatesPageCache[cacheKey];
      const pending = inFlightTemplatePages.get(cacheKey);

      const canUseCurrentState =
        this.templatesLoaded &&
        !force &&
        this.templatesPagination.page === page &&
        this.templatesPagination.size === size &&
        this.currentTemplateTenantId === resolvedTenantId;

      if (canUseCurrentState) {
        return this.templates;
      }

      if (cachedPage && !force) {
        this.setTemplatesFromCache(cachedPage, resolvedTenantId);
        return this.templates;
      }

      if (pending) {
        const result = await pending;
        this.templates = result.content;
        this.templatesPagination = result.pagination;
        this.templatesLoaded = true;
        this.currentTemplateTenantId = resolvedTenantId;
        this.cacheTemplatesPage(result, resolvedTenantId);
        return this.templates;
      }

      this.isTemplatesLoading = true;
      const request = templateService.getAll({
        page,
        size,
        tenantId: resolvedTenantId || undefined,
      });
      inFlightTemplatePages.set(cacheKey, request);
      try {
        const result = await request;
        this.templates = result.content;
        this.templatesPagination = result.pagination;
        this.templatesLoaded = true;
        this.currentTemplateTenantId = resolvedTenantId;
        this.cacheTemplatesPage(result, resolvedTenantId);
        return this.templates;
      } finally {
        inFlightTemplatePages.delete(cacheKey);
        this.isTemplatesLoading = false;
      }
    },

    async revalidateTemplates(
      options?: ListQueryParams & { tenantId?: string },
    ) {
      if (this.isTemplatesLoading) {
        return;
      }

      const page = options?.page ?? this.templatesPagination.page;
      const size = options?.size ?? this.templatesPagination.size;
      const tenantId = options?.tenantId ?? this.currentTemplateTenantId;

      try {
        const result = await templateService.getAll({
          page,
          size,
          tenantId: tenantId || undefined,
        });
        this.templates = result.content;
        this.templatesPagination = result.pagination;
        this.templatesLoaded = true;
        this.currentTemplateTenantId = tenantId;
        this.cacheTemplatesPage(result, tenantId);
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
      this.descendantsByCategoryId = buildDescendantsIndex(this.categories);
      this.categoriesLoaded = true;

      for (const key of Object.keys(this.categoriesPageCache)) {
        const cached = this.categoriesPageCache[key];
        if (!cached) {
          continue;
        }

        const foundIndex = cached.content.findIndex(
          (item) => item.id === category.id,
        );
        if (foundIndex >= 0) {
          const nextContent = [...cached.content];
          nextContent[foundIndex] = cloneCategory(category);
          this.categoriesPageCache[key] = {
            ...cached,
            content: nextContent,
          };
        }
      }
    },

    applyOptimisticCategoryUpdate(
      categoryId: number,
      payload: CreateCategoryRequest,
    ) {
      const previousCategories = cloneCategoryTree(this.categories);
      const previousCache = Object.fromEntries(
        Object.entries(this.categoriesPageCache).map(([key, value]) => [
          key,
          {
            ...value,
            content: cloneCategoryTree(value.content),
            pagination: { ...value.pagination },
          },
        ]),
      ) as Record<string, CachedPage<CategoryResponse>>;

      this.updateCategoriesAcrossCache((content) => {
        const result = updateCategoryInTree(
          content,
          categoryId,
          (category) => ({
            ...category,
            name: payload.name,
            slug: payload.slug,
            description: payload.description ?? "",
            parentId:
              payload.parentId === undefined
                ? category.parentId
                : payload.parentId,
            updatedAt: new Date().toISOString(),
          }),
        );
        return result.updated ? result.categories : content;
      });

      return () => {
        this.categories = previousCategories;
        this.categoriesPageCache = previousCache;
        this.descendantsByCategoryId = buildDescendantsIndex(this.categories);
      };
    },

    applyOptimisticCategoryRemove(categoryId: number) {
      const previousCategories = cloneCategoryTree(this.categories);
      const previousCache = Object.fromEntries(
        Object.entries(this.categoriesPageCache).map(([key, value]) => [
          key,
          {
            ...value,
            content: cloneCategoryTree(value.content),
            pagination: { ...value.pagination },
          },
        ]),
      ) as Record<string, CachedPage<CategoryResponse>>;

      this.updateCategoriesAcrossCache((content) => {
        const result = removeCategoryFromTree(content, categoryId);
        return result.updated ? result.categories : content;
      });

      return () => {
        this.categories = previousCategories;
        this.categoriesPageCache = previousCache;
        this.descendantsByCategoryId = buildDescendantsIndex(this.categories);
      };
    },

    reconcileCategoryAfterMutation(category: CategoryResponse) {
      this.updateCategoriesAcrossCache((content) => {
        const result = updateCategoryInTree(content, category.id, () =>
          cloneCategory(category),
        );
        return result.updated ? result.categories : content;
      });
      this.descendantsByCategoryId = buildDescendantsIndex(this.categories);
    },

    removeCategory(categoryId: number) {
      this.categories = this.categories.filter(
        (item) => item.id !== categoryId,
      );
      this.descendantsByCategoryId = buildDescendantsIndex(this.categories);

      for (const key of Object.keys(this.categoriesPageCache)) {
        const cached = this.categoriesPageCache[key];
        if (!cached) {
          continue;
        }

        this.categoriesPageCache[key] = {
          ...cached,
          content: cached.content.filter((item) => item.id !== categoryId),
        };
      }
    },

    prependTenant(tenant: UserResponse) {
      const nextTenants = [tenant, ...this.tenants].slice(
        0,
        this.tenantsPagination.size,
      );
      this.tenants = nextTenants;
      this.tenantsPagination = {
        ...this.tenantsPagination,
        totalElements: this.tenantsPagination.totalElements + 1,
        numberOfElements: nextTenants.length,
        totalPages: Math.max(
          1,
          Math.ceil(
            (this.tenantsPagination.totalElements + 1) /
              Math.max(this.tenantsPagination.size, 1),
          ),
        ),
        empty: false,
      };
      this.tenantsLoaded = true;

      const cacheKey = getCacheKey(
        this.tenantsPagination.page,
        this.tenantsPagination.size,
      );
      const cached = this.tenantsPageCache[cacheKey];
      if (cached) {
        const nextContent = [tenant, ...cached.content].slice(
          0,
          cached.pagination.size,
        );
        const nextTotalElements = cached.pagination.totalElements + 1;
        this.tenantsPageCache[cacheKey] = {
          ...cached,
          content: nextContent,
          pagination: {
            ...cached.pagination,
            totalElements: nextTotalElements,
            numberOfElements: nextContent.length,
            totalPages: Math.max(
              1,
              Math.ceil(
                nextTotalElements / Math.max(cached.pagination.size, 1),
              ),
            ),
            empty: false,
          },
        };
      }
    },

    invalidateCategories() {
      this.categoriesLoaded = false;
      this.categoriesPageCache = {};
    },

    invalidateTenants() {
      this.tenantsLoaded = false;
      this.tenantsPageCache = {};
    },

    invalidateCustomers() {
      this.customersLoaded = false;
      this.customersPageCache = {};
    },

    invalidateTemplates() {
      this.templatesLoaded = false;
      this.templatesPageCache = {};
      this.currentTemplateTenantId = "";
    },
  },
});
