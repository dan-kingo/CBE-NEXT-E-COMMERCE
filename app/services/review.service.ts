import {
  DEFAULT_PAGE_SIZE,
  createEmptyPagination,
} from "~/services/pagination";
import type {
  AdminReviewDecisionRequest,
  ApiStatus,
  PaginatedListResult,
  ReviewListQueryParams,
  ReviewListResponse,
  ReviewResponse,
  ReviewSummaryResponse,
} from "~/types/admin";

interface ApiResponse<T> {
  status: ApiStatus;
  data: T;
}

const isApiResponse = <T>(value: unknown): value is ApiResponse<T> => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return "data" in record;
};

const isReviewListResponse = (value: unknown): value is ReviewListResponse => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return Array.isArray(record.content) && Boolean(record.pagination);
};

const emptySummary: ReviewSummaryResponse = {
  averageRating: 0,
  totalPublishedReviews: 0,
  ratingBreakdown: {},
};

const normalizeReviewListResponse = (
  response:
    | ReviewListResponse
    | ApiResponse<ReviewListResponse>
    | ReviewResponse[],
  fallbackPage = 0,
  fallbackSize = DEFAULT_PAGE_SIZE,
): {
  list: PaginatedListResult<ReviewResponse>;
  summary: ReviewSummaryResponse;
} => {
  if (Array.isArray(response)) {
    return {
      list: {
        content: response,
        pagination: {
          page: fallbackPage,
          size: fallbackSize,
          totalElements: response.length,
          totalPages: response.length ? 1 : 0,
          numberOfElements: response.length,
          first: true,
          last: true,
          hasNext: false,
          hasPrevious: false,
          empty: response.length === 0,
        },
      },
      summary: emptySummary,
    };
  }

  const payload = isApiResponse<ReviewListResponse>(response)
    ? response.data
    : response;

  if (isReviewListResponse(payload)) {
    return {
      list: {
        content: payload.content,
        pagination: payload.pagination,
      },
      summary: payload.summary ?? emptySummary,
    };
  }

  return {
    list: {
      content: [],
      pagination: createEmptyPagination(fallbackPage, fallbackSize),
    },
    summary: emptySummary,
  };
};

const normalizeReviewResponse = (
  response: ReviewResponse | ApiResponse<ReviewResponse>,
) => {
  return isApiResponse<ReviewResponse>(response) ? response.data : response;
};

export const reviewService = {
  async getAll(params: ReviewListQueryParams = {}) {
    const { $api } = useNuxtApp();
    const page = params.page ?? 0;
    const size = params.size ?? DEFAULT_PAGE_SIZE;

    const response = await $api<
      ReviewListResponse | ApiResponse<ReviewListResponse> | ReviewResponse[]
    >("/reviews", {
      query: {
        tenantId: params.tenantId,
        storeId: params.storeId,
        productId: params.productId,
        moderationStatus: params.moderationStatus,
        visibilityStatus: params.visibilityStatus,
        page,
        size,
      },
    });

    return normalizeReviewListResponse(response, page, size);
  },

  async decide(reviewId: number, payload: AdminReviewDecisionRequest) {
    const { $api } = useNuxtApp();
    const response = await $api<ReviewResponse | ApiResponse<ReviewResponse>>(
      `/reviews/${reviewId}/decision`,
      {
        method: "PATCH",
        body: payload,
      },
    );

    return normalizeReviewResponse(response);
  },
};
