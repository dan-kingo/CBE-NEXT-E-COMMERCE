import type {
  PaginatedApiResponse,
  PaginatedListResult,
  PaginationMeta,
} from "~/types/admin";

export const DEFAULT_PAGE_SIZE = 10;

export const createEmptyPagination = (
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

const isPaginatedApiResponse = <T>(
  value: unknown,
): value is PaginatedApiResponse<T> => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const maybeRecord = value as Record<string, unknown>;
  const maybeData = maybeRecord.data as Record<string, unknown> | undefined;

  return Boolean(
    maybeData && Array.isArray(maybeData.content) && maybeData.pagination,
  );
};

export const normalizePaginatedList = <T>(
  response: PaginatedApiResponse<T> | T[],
  fallbackPage = 0,
  fallbackSize = DEFAULT_PAGE_SIZE,
): PaginatedListResult<T> => {
  if (Array.isArray(response)) {
    const inferredSize = fallbackSize || response.length || DEFAULT_PAGE_SIZE;
    return {
      content: response,
      pagination: {
        page: fallbackPage,
        size: inferredSize,
        totalElements: response.length,
        totalPages: response.length ? 1 : 0,
        numberOfElements: response.length,
        first: true,
        last: true,
        hasNext: false,
        hasPrevious: false,
        empty: response.length === 0,
      },
    };
  }

  if (isPaginatedApiResponse<T>(response)) {
    return {
      content: response.data.content,
      pagination: response.data.pagination,
    };
  }

  return {
    content: [],
    pagination: createEmptyPagination(fallbackPage, fallbackSize),
  };
};
