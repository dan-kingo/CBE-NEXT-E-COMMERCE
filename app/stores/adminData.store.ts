import { defineStore } from "pinia";
import {
  createEmptyPagination,
  DEFAULT_PAGE_SIZE,
} from "~/services/pagination";
import { customerService } from "~/services/customer.service";
import { reviewService } from "~/services/review.service";
import { templateService } from "~/services/template.service";
import type {
  AdminReviewDecisionRequest,
  CustomerResponse,
  ListQueryParams,
  PaginatedListResult,
  PaginationMeta,
  ReviewListQueryParams,
  ReviewResponse,
  ReviewSummaryResponse,
  TemplateResponse,
  UserResponse,
} from "~/types/admin";

interface ListLoadOptions extends ListQueryParams {
  force?: boolean;
}

interface TemplateListLoadOptions extends ListLoadOptions {}

interface ReviewListLoadOptions extends ListLoadOptions {
  tenantId?: string;
  storeId?: number;
  productId?: number;
  moderationStatus?: ReviewListQueryParams["moderationStatus"];
  visibilityStatus?: ReviewListQueryParams["visibilityStatus"];
}

interface CachedPage<T> extends PaginatedListResult<T> {
  fetchedAt: number;
}

interface ReviewCachedPage extends CachedPage<ReviewResponse> {
  summary: ReviewSummaryResponse;
}

const getCacheKey = (page: number, size: number) => `${page}:${size}`;
const getTemplateCacheKey = (page: number, size: number) => `${page}:${size}`;
const getReviewFilterKey = (filters: ReviewListQueryParams) =>
  JSON.stringify({
    tenantId: filters.tenantId ?? "",
    storeId: filters.storeId ?? null,
    productId: filters.productId ?? null,
    moderationStatus: filters.moderationStatus ?? "",
    visibilityStatus: filters.visibilityStatus ?? "",
  });
const getReviewCacheKey = (filterKey: string, page: number, size: number) =>
  `${filterKey}:${page}:${size}`;

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
const inFlightReviewPages = new Map<
  string,
  Promise<{
    list: PaginatedListResult<ReviewResponse>;
    summary: ReviewSummaryResponse;
  }>
>();

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
) => {
  return normalizeListLoadOptions(value, currentPagination);
};

const normalizeReviewListLoadOptions = (
  value: boolean | ReviewListLoadOptions | undefined,
  currentPagination: PaginationMeta,
) => {
  const normalized = normalizeListLoadOptions(value, currentPagination);

  if (typeof value === "boolean" || !value) {
    return {
      ...normalized,
      tenantId: undefined,
      storeId: undefined,
      productId: undefined,
      moderationStatus: undefined,
      visibilityStatus: undefined,
    };
  }

  return {
    ...normalized,
    tenantId: value.tenantId,
    storeId: value.storeId,
    productId: value.productId,
    moderationStatus: value.moderationStatus,
    visibilityStatus: value.visibilityStatus,
  };
};

export const useAdminDataStore = defineStore("adminData", {
  state: () => ({
    tenants: [] as UserResponse[],
    customers: [] as CustomerResponse[],
    templates: [] as TemplateResponse[],
    reviews: [] as ReviewResponse[],
    reviewsSummary: {
      averageRating: 0,
      totalPublishedReviews: 0,
      ratingBreakdown: {},
    } as ReviewSummaryResponse,

    tenantsPagination: createEmptyPagination(0, DEFAULT_PAGE_SIZE),
    customersPagination: createEmptyPagination(0, DEFAULT_PAGE_SIZE),
    templatesPagination: createEmptyPagination(0, DEFAULT_PAGE_SIZE),
    reviewsPagination: createEmptyPagination(0, DEFAULT_PAGE_SIZE),

    tenantsPageCache: {} as Record<string, CachedPage<UserResponse>>,
    customersPageCache: {} as Record<string, CachedPage<CustomerResponse>>,
    templatesPageCache: {} as Record<string, CachedPage<TemplateResponse>>,
    reviewsPageCache: {} as Record<string, ReviewCachedPage>,

    tenantsLoaded: false,
    customersLoaded: false,
    templatesLoaded: false,
    reviewsLoaded: false,

    isTenantsLoading: false,
    isCustomersLoading: false,
    isTemplatesLoading: false,
    isReviewsLoading: false,

    currentReviewFilterKey: "",
  }),

  actions: {
    async warmDashboardData() {
      const size = DEFAULT_PAGE_SIZE;

      await Promise.allSettled([
        this.ensureTenants({ page: 0, size }),
        this.ensureCustomers({ page: 0, size }),
      ]);
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

    setTemplatesFromCache(page: CachedPage<TemplateResponse>) {
      this.templates = [...page.content];
      this.templatesPagination = { ...page.pagination };
      this.templatesLoaded = true;
    },

    setReviewsFromCache(page: ReviewCachedPage, filterKey: string) {
      this.reviews = [...page.content];
      this.reviewsPagination = { ...page.pagination };
      this.reviewsSummary = {
        averageRating: page.summary.averageRating,
        totalPublishedReviews: page.summary.totalPublishedReviews,
        ratingBreakdown: { ...page.summary.ratingBreakdown },
      };
      this.reviewsLoaded = true;
      this.currentReviewFilterKey = filterKey;
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

    cacheTemplatesPage(result: PaginatedListResult<TemplateResponse>) {
      this.templatesPageCache[
        getTemplateCacheKey(result.pagination.page, result.pagination.size)
      ] = {
        ...result,
        content: [...result.content],
        pagination: { ...result.pagination },
        fetchedAt: Date.now(),
      };
    },

    cacheReviewsPage(
      result: {
        list: PaginatedListResult<ReviewResponse>;
        summary: ReviewSummaryResponse;
      },
      filterKey: string,
    ) {
      this.reviewsPageCache[
        getReviewCacheKey(
          filterKey,
          result.list.pagination.page,
          result.list.pagination.size,
        )
      ] = {
        ...result.list,
        content: [...result.list.content],
        pagination: { ...result.list.pagination },
        summary: {
          averageRating: result.summary.averageRating,
          totalPublishedReviews: result.summary.totalPublishedReviews,
          ratingBreakdown: { ...result.summary.ratingBreakdown },
        },
        fetchedAt: Date.now(),
      };
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
      const { force, page, size } = normalizeTemplateListLoadOptions(
        options,
        this.templatesPagination,
      );
      const cacheKey = getTemplateCacheKey(page, size);
      const cachedPage = this.templatesPageCache[cacheKey];
      const pending = inFlightTemplatePages.get(cacheKey);

      const canUseCurrentState =
        this.templatesLoaded &&
        !force &&
        this.templatesPagination.page === page &&
        this.templatesPagination.size === size;

      if (canUseCurrentState) {
        return this.templates;
      }

      if (cachedPage && !force) {
        this.setTemplatesFromCache(cachedPage);
        return this.templates;
      }

      if (pending) {
        const result = await pending;
        this.templates = result.content;
        this.templatesPagination = result.pagination;
        this.templatesLoaded = true;
        this.cacheTemplatesPage(result);
        return this.templates;
      }

      this.isTemplatesLoading = true;
      const request = templateService.getAll({ page, size });
      inFlightTemplatePages.set(cacheKey, request);
      try {
        const result = await request;
        this.templates = result.content;
        this.templatesPagination = result.pagination;
        this.templatesLoaded = true;
        this.cacheTemplatesPage(result);
        return this.templates;
      } finally {
        inFlightTemplatePages.delete(cacheKey);
        this.isTemplatesLoading = false;
      }
    },

    async revalidateTemplates(options?: ListQueryParams) {
      if (this.isTemplatesLoading) {
        return;
      }

      const page = options?.page ?? this.templatesPagination.page;
      const size = options?.size ?? this.templatesPagination.size;

      try {
        const result = await templateService.getAll({ page, size });
        this.templates = result.content;
        this.templatesPagination = result.pagination;
        this.templatesLoaded = true;
        this.cacheTemplatesPage(result);
      } catch {
        // Background refresh is best-effort and should not interrupt UX.
      }
    },

    async ensureReviews(options?: boolean | ReviewListLoadOptions) {
      const {
        force,
        page,
        size,
        tenantId,
        storeId,
        productId,
        moderationStatus,
        visibilityStatus,
      } = normalizeReviewListLoadOptions(options, this.reviewsPagination);

      const filters: ReviewListQueryParams = {
        tenantId,
        storeId,
        productId,
        moderationStatus,
        visibilityStatus,
      };
      const filterKey = getReviewFilterKey(filters);
      const cacheKey = getReviewCacheKey(filterKey, page, size);
      const cachedPage = this.reviewsPageCache[cacheKey];
      const pending = inFlightReviewPages.get(cacheKey);

      const canUseCurrentState =
        this.reviewsLoaded &&
        !force &&
        this.reviewsPagination.page === page &&
        this.reviewsPagination.size === size &&
        this.currentReviewFilterKey === filterKey;

      if (canUseCurrentState) {
        return this.reviews;
      }

      if (cachedPage && !force) {
        this.setReviewsFromCache(cachedPage, filterKey);
        return this.reviews;
      }

      if (pending) {
        const result = await pending;
        this.reviews = result.list.content;
        this.reviewsPagination = result.list.pagination;
        this.reviewsSummary = result.summary;
        this.reviewsLoaded = true;
        this.currentReviewFilterKey = filterKey;
        this.cacheReviewsPage(result, filterKey);
        return this.reviews;
      }

      this.isReviewsLoading = true;
      const request = reviewService.getAll({
        ...filters,
        page,
        size,
      });
      inFlightReviewPages.set(cacheKey, request);

      try {
        const result = await request;
        this.reviews = result.list.content;
        this.reviewsPagination = result.list.pagination;
        this.reviewsSummary = result.summary;
        this.reviewsLoaded = true;
        this.currentReviewFilterKey = filterKey;
        this.cacheReviewsPage(result, filterKey);
        return this.reviews;
      } finally {
        inFlightReviewPages.delete(cacheKey);
        this.isReviewsLoading = false;
      }
    },

    async revalidateReviews(options?: ReviewListLoadOptions) {
      if (this.isReviewsLoading) {
        return;
      }

      const page = options?.page ?? this.reviewsPagination.page;
      const size = options?.size ?? this.reviewsPagination.size;
      const filters: ReviewListQueryParams = {
        tenantId: options?.tenantId,
        storeId: options?.storeId,
        productId: options?.productId,
        moderationStatus: options?.moderationStatus,
        visibilityStatus: options?.visibilityStatus,
      };
      const filterKey = getReviewFilterKey(filters);

      try {
        const result = await reviewService.getAll({
          ...filters,
          page,
          size,
        });
        this.reviews = result.list.content;
        this.reviewsPagination = result.list.pagination;
        this.reviewsSummary = result.summary;
        this.reviewsLoaded = true;
        this.currentReviewFilterKey = filterKey;
        this.cacheReviewsPage(result, filterKey);
      } catch {
        // Background refresh is best-effort and should not interrupt UX.
      }
    },

    upsertReview(review: ReviewResponse) {
      const index = this.reviews.findIndex((item) => item.id === review.id);
      if (index >= 0) {
        const next = [...this.reviews];
        next[index] = review;
        this.reviews = next;
      }

      for (const key of Object.keys(this.reviewsPageCache)) {
        const cached = this.reviewsPageCache[key];
        if (!cached) {
          continue;
        }

        const cachedIndex = cached.content.findIndex(
          (item) => item.id === review.id,
        );
        if (cachedIndex >= 0) {
          const nextContent = [...cached.content];
          nextContent[cachedIndex] = review;
          this.reviewsPageCache[key] = {
            ...cached,
            content: nextContent,
          };
        }
      }
    },

    async decideReview(reviewId: number, payload: AdminReviewDecisionRequest) {
      const updated = await reviewService.decide(reviewId, payload);
      this.upsertReview(updated);
      return updated;
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
    },

    invalidateReviews() {
      this.reviewsLoaded = false;
      this.reviewsPageCache = {};
      this.currentReviewFilterKey = "";
    },
  },
});
