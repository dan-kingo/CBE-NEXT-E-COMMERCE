import {
  DEFAULT_PAGE_SIZE,
  normalizePaginatedList,
} from "~/services/pagination";
import type {
  ApiStatus,
  CategoryResponse,
  CreateCategoryRequest,
  ListQueryParams,
  PaginatedApiResponse,
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

const normalizeCategoryResponse = (
  response: CategoryResponse | ApiResponse<CategoryResponse>,
) => {
  return isApiResponse<CategoryResponse>(response) ? response.data : response;
};

const collectDescendantIds = (category: CategoryResponse) => {
  const ids: number[] = [];
  const visit = (nodes: CategoryResponse[] | null | undefined) => {
    if (!Array.isArray(nodes)) {
      return;
    }

    for (const node of nodes) {
      ids.push(node.id);
      if (Array.isArray(node.children) && node.children.length) {
        visit(node.children);
      }
    }
  };

  visit(category.children);
  return ids;
};

export const categoryService = {
  async getAll(params: ListQueryParams = {}) {
    const { $api } = useNuxtApp();
    const page = params.page ?? 0;
    const size = params.size ?? DEFAULT_PAGE_SIZE;

    const response = await $api<
      PaginatedApiResponse<CategoryResponse> | CategoryResponse[]
    >("/public/categories", {
      query: { page, size },
    });

    return normalizePaginatedList(response, page, size);
  },

  async getById(id: number) {
    const { $api } = useNuxtApp();
    const response = await $api<
      CategoryResponse | ApiResponse<CategoryResponse>
    >(`/public/categories/${id}`);
    return normalizeCategoryResponse(response);
  },

  async create(payload: CreateCategoryRequest) {
    const { $api } = useNuxtApp();
    const response = await $api<
      CategoryResponse | ApiResponse<CategoryResponse>
    >("/categories", {
      method: "POST",
      body: payload,
    });
    return normalizeCategoryResponse(response);
  },

  async update(id: number, payload: CreateCategoryRequest) {
    const { $api } = useNuxtApp();
    const response = await $api<
      CategoryResponse | ApiResponse<CategoryResponse>
    >(`/categories/${id}`, {
      method: "PUT",
      body: payload,
    });
    return normalizeCategoryResponse(response);
  },

  async remove(id: number) {
    const { $api } = useNuxtApp();
    return await $api(`/categories/${id}`, {
      method: "DELETE",
    });
  },

  async getDescendantIds(id: number) {
    const category = await categoryService.getById(id);
    return collectDescendantIds(category);
  },
};
