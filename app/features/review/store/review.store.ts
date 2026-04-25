import { defineStore } from "pinia";
import {
  createEmptyPagination,
  DEFAULT_PAGE_SIZE,
} from "~/services/pagination";
import { reviewService } from "~/features/review/services/review.service";
import type {
  AdminReviewDecisionRequest,
  ListQueryParams,
  PaginatedListResult,
  PaginationMeta,
  ReviewListQueryParams,
  ReviewResponse,
  ReviewSummaryResponse,
} from "~/features/review/types/review.types";

interface ReviewListLoadOptions extends ListQueryParams {
  force?: boolean;
  tenantId?: string;
  storeId?: ReviewListQueryParams["storeId"];
  productId?: ReviewListQueryParams["productId"];
  moderationStatus?: ReviewListQueryParams["moderationStatus"];
  visibilityStatus?: ReviewListQueryParams["visibilityStatus"];
}

interface CachedPage<T> extends PaginatedListResult<T> {
  fetchedAt: number;
}

interface ReviewCachedPage extends CachedPage<ReviewResponse> {
  summary: ReviewSummaryResponse;
}

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

const inFlightReviewPages = new Map<
  string,
  Promise<{
    list: PaginatedListResult<ReviewResponse>;
    summary: ReviewSummaryResponse;
  }>
>();

const normalizeReviewListLoadOptions = (
  value: boolean | ReviewListLoadOptions | undefined,
  currentPagination: PaginationMeta,
) => {
  if (typeof value === "boolean") {
    return {
      force: value,
      page: currentPagination.page,
      size: currentPagination.size,
      tenantId: undefined,
      storeId: undefined,
      productId: undefined,
      moderationStatus: undefined,
      visibilityStatus: undefined,
    };
  }

  return {
    force: value?.force ?? false,
    page: value?.page ?? currentPagination.page,
    size: value?.size ?? currentPagination.size,
    tenantId: value?.tenantId,
    storeId: value?.storeId,
    productId: value?.productId,
    moderationStatus: value?.moderationStatus,
    visibilityStatus: value?.visibilityStatus,
  };
};

export const useReviewStore = defineStore("review", {
  state: () => ({
    reviews: [] as ReviewResponse[],
    reviewsSummary: {
      averageRating: 0,
      totalPublishedReviews: 0,
      ratingBreakdown: {},
    } as ReviewSummaryResponse,
    pagination: createEmptyPagination(0, DEFAULT_PAGE_SIZE),
    pageCache: {} as Record<string, ReviewCachedPage>,
    loaded: false,
    isLoading: false,
    currentFilterKey: "",
  }),

  actions: {
    setFromCache(page: ReviewCachedPage, filterKey: string) {
      this.reviews = [...page.content];
      this.pagination = { ...page.pagination };
      this.reviewsSummary = {
        averageRating: page.summary.averageRating,
        totalPublishedReviews: page.summary.totalPublishedReviews,
        ratingBreakdown: { ...page.summary.ratingBreakdown },
      };
      this.loaded = true;
      this.currentFilterKey = filterKey;
    },

    cachePage(
      result: {
        list: PaginatedListResult<ReviewResponse>;
        summary: ReviewSummaryResponse;
      },
      filterKey: string,
    ) {
      this.pageCache[
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
      } = normalizeReviewListLoadOptions(options, this.pagination);

      const filters: ReviewListQueryParams = {
        tenantId,
        storeId,
        productId,
        moderationStatus,
        visibilityStatus,
      };
      const filterKey = getReviewFilterKey(filters);
      const cacheKey = getReviewCacheKey(filterKey, page, size);
      const cachedPage = this.pageCache[cacheKey];
      const pending = inFlightReviewPages.get(cacheKey);

      const canUseCurrentState =
        this.loaded &&
        !force &&
        this.pagination.page === page &&
        this.pagination.size === size &&
        this.currentFilterKey === filterKey;

      if (canUseCurrentState) {
        return this.reviews;
      }

      if (cachedPage && !force) {
        this.setFromCache(cachedPage, filterKey);
        return this.reviews;
      }

      if (pending) {
        const result = await pending;
        this.reviews = result.list.content;
        this.pagination = result.list.pagination;
        this.reviewsSummary = result.summary;
        this.loaded = true;
        this.currentFilterKey = filterKey;
        this.cachePage(result, filterKey);
        return this.reviews;
      }

      this.isLoading = true;
      const request = reviewService.getAll({
        ...filters,
        page,
        size,
      });
      inFlightReviewPages.set(cacheKey, request);

      try {
        const result = await request;
        this.reviews = result.list.content;
        this.pagination = result.list.pagination;
        this.reviewsSummary = result.summary;
        this.loaded = true;
        this.currentFilterKey = filterKey;
        this.cachePage(result, filterKey);
        return this.reviews;
      } finally {
        inFlightReviewPages.delete(cacheKey);
        this.isLoading = false;
      }
    },

    async revalidateReviews(options?: ReviewListLoadOptions) {
      if (this.isLoading) {
        return;
      }

      const page = options?.page ?? this.pagination.page;
      const size = options?.size ?? this.pagination.size;
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
        this.pagination = result.list.pagination;
        this.reviewsSummary = result.summary;
        this.loaded = true;
        this.currentFilterKey = filterKey;
        this.cachePage(result, filterKey);
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

      for (const key of Object.keys(this.pageCache)) {
        const cached = this.pageCache[key];
        if (!cached) {
          continue;
        }

        const cachedIndex = cached.content.findIndex(
          (item) => item.id === review.id,
        );
        if (cachedIndex >= 0) {
          const nextContent = [...cached.content];
          nextContent[cachedIndex] = review;
          this.pageCache[key] = {
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

    invalidateReviews() {
      this.loaded = false;
      this.pageCache = {};
      this.currentFilterKey = "";
    },
  },
});
