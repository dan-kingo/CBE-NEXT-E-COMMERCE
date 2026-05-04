import {
  categoryDtoSchema,
  categoryListResponseSchema,
  categoryResponseSchema,
  createCategorySchema,
} from "~/features/category/schemas/category.schema";
import {
  mapCategoryDto,
  mapCategoryDtoList,
} from "~/features/category/utils/category.mapper";
import type {
  Category,
  CreateCategoryRequest,
  ListQueryParams,
  PaginatedListResult,
} from "~/features/category/types/category.types";
import { DEFAULT_PAGE_SIZE } from "~/services/pagination";

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

const normalizeCategoryListResponse = (
  response: unknown,
  page: number,
  size: number,
): PaginatedListResult<Category> => {
  if (Array.isArray(response)) {
    const parsed = categoryDtoSchema.array().parse(response);
    const content = mapCategoryDtoList(parsed);

    return {
      content,
      pagination: createFallbackPagination(page, size, content.length),
    };
  }

  const parsed = categoryListResponseSchema.parse(response);

  if (!parsed.data) {
    return {
      content: [],
      pagination: createFallbackPagination(page, size, 0),
    };
  }

  return {
    content: mapCategoryDtoList(parsed.data.content),
    pagination: parsed.data.pagination,
  };
};

const normalizeCategoryResponse = (response: unknown): Category => {
  if (response && typeof response === "object" && "id" in response) {
    const parsed = categoryDtoSchema.parse(response);
    return mapCategoryDto(parsed);
  }

  const parsed = categoryResponseSchema.parse(response);
  if (!parsed.data) {
    throw new Error("Category response does not include data.");
  }

  return mapCategoryDto(parsed.data);
};

export const categoryService = {
  async getAll(params: ListQueryParams = {}) {
    const { $api } = useNuxtApp();
    const page = params.page ?? 0;
    const size = params.size ?? DEFAULT_PAGE_SIZE;

    const response = await $api<unknown>("/public/categories", {
      query: { page, size },
    });

    return normalizeCategoryListResponse(response, page, size);
  },

  async getById(id: string) {
    const { $api } = useNuxtApp();
    const response = await $api<unknown>(`/public/categories/${id}`);
    return normalizeCategoryResponse(response);
  },

  async create(payload: CreateCategoryRequest) {
    const { $api } = useNuxtApp();
    const body = createCategorySchema.parse(payload);
    const response = await $api<unknown>("/categories", {
      method: "POST",
      body,
    });

    return normalizeCategoryResponse(response);
  },

  async update(id: string, payload: CreateCategoryRequest) {
    const { $api } = useNuxtApp();
    const body = createCategorySchema.parse(payload);
    const response = await $api<unknown>(`/categories/${id}`, {
      method: "PATCH",
      body,
    });

    return normalizeCategoryResponse(response);
  },

  async remove(id: string) {
    const { $api } = useNuxtApp();
    return await $api(`/categories/${id}`, {
      method: "DELETE",
    });
  },
};
