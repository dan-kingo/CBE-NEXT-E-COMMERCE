import { defineStore } from "pinia";
import { DEFAULT_PAGE_SIZE } from "~/services/pagination";
import { categoryService } from "~/features/category/services/category.service";
import type {
  Category,
  CreateCategoryRequest,
  ListQueryParams,
  PaginatedListResult,
  PaginationMeta,
} from "~/features/category/types/category.types";

const CACHE_TTL = 60_000;
const inFlightCategoryPages = new Map<
  string,
  Promise<PaginatedListResult<Category>>
>();

const getCacheKey = (page: number, size: number) => `${page}:${size}`;

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

const cloneCategory = (category: Category): Category => ({
  ...category,
  children: category.children.map(cloneCategory),
});

const cloneCategoryTree = (categories: Category[]) =>
  categories.map(cloneCategory);

const buildDescendantsIndex = (categories: Category[]) => {
  const index: Record<string, string[]> = {};

  const visit = (category: Category): string[] => {
    const descendants: string[] = [];
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
  categories: Category[],
  categoryId: string,
  updater: (category: Category) => Category,
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

const removeCategoryFromTree = (categories: Category[], categoryId: string) => {
  let updated = false;

  const next: Category[] = [];
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

export const useCategoryStore = defineStore("category", {
  state: () => ({
    data: [] as Category[],
    descendantsByCategoryId: {} as Record<string, string[]>,
    pagination: createEmptyPagination(),
    cachedPages: {} as Record<string, Category[]>,
    paginationByPage: {} as Record<string, PaginationMeta>,
    lastFetchedByPage: {} as Record<string, number>,
    lastFetched: null as number | null,
    isFetching: false,
    isLoaded: false,
  }),

  getters: {
    categories: (state) => state.data,
  },

  actions: {
    setCategoriesPage(result: PaginatedListResult<Category>) {
      this.data = cloneCategoryTree(result.content);
      this.pagination = { ...result.pagination };
      this.descendantsByCategoryId = buildDescendantsIndex(this.data);
      this.isLoaded = true;
      this.lastFetched = Date.now();

      const cacheKey = getCacheKey(
        result.pagination.page,
        result.pagination.size,
      );
      this.cachedPages[cacheKey] = cloneCategoryTree(result.content);
      this.paginationByPage[cacheKey] = { ...result.pagination };
      this.lastFetchedByPage[cacheKey] = Date.now();
    },

    invalidate() {
      this.cachedPages = {};
      this.paginationByPage = {};
      this.lastFetchedByPage = {};
      this.lastFetched = null;
      this.isLoaded = false;
    },

    updateCategoriesAcrossCache(apply: (content: Category[]) => Category[]) {
      const current = apply(this.data);
      if (current !== this.data) {
        this.data = current;
      }

      for (const key of Object.keys(this.cachedPages)) {
        const cached = this.cachedPages[key];
        if (!cached) {
          continue;
        }

        const nextContent = apply(cached);
        if (nextContent !== cached) {
          this.cachedPages[key] = cloneCategoryTree(nextContent);
        }
      }
    },

    applyOptimisticCategoryUpdate(
      categoryId: string,
      payload: CreateCategoryRequest,
    ) {
      const previousCategories = cloneCategoryTree(this.data);
      const previousCache = Object.fromEntries(
        Object.entries(this.cachedPages).map(([key, value]) => [
          key,
          cloneCategoryTree(value),
        ]),
      ) as Record<string, Category[]>;

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
        this.data = previousCategories;
        this.cachedPages = previousCache;
        this.descendantsByCategoryId = buildDescendantsIndex(this.data);
      };
    },

    applyOptimisticCategoryRemove(categoryId: string) {
      const previousCategories = cloneCategoryTree(this.data);
      const previousCache = Object.fromEntries(
        Object.entries(this.cachedPages).map(([key, value]) => [
          key,
          cloneCategoryTree(value),
        ]),
      ) as Record<string, Category[]>;

      this.updateCategoriesAcrossCache((content) => {
        const result = removeCategoryFromTree(content, categoryId);
        return result.updated ? result.categories : content;
      });

      return () => {
        this.data = previousCategories;
        this.cachedPages = previousCache;
        this.descendantsByCategoryId = buildDescendantsIndex(this.data);
      };
    },

    reconcileCategoryAfterMutation(category: Category) {
      this.updateCategoriesAcrossCache((content) => {
        const result = updateCategoryInTree(content, category.id, () =>
          cloneCategory(category),
        );

        return result.updated ? result.categories : content;
      });

      this.descendantsByCategoryId = buildDescendantsIndex(this.data);
    },

    async ensureCategories(options?: {
      force?: boolean;
      page?: number;
      size?: number;
    }) {
      const force = options?.force ?? false;
      const page = options?.page ?? this.pagination.page;
      const size = options?.size ?? this.pagination.size;
      const cacheKey = getCacheKey(page, size);
      const pending = inFlightCategoryPages.get(cacheKey);
      const cached = this.cachedPages[cacheKey];
      const lastFetched = this.lastFetchedByPage[cacheKey];
      const isFresh = Boolean(
        lastFetched && Date.now() - lastFetched < CACHE_TTL,
      );

      if (
        this.isLoaded &&
        !force &&
        this.pagination.page === page &&
        this.pagination.size === size
      ) {
        return this.data;
      }

      if (cached && !force && isFresh) {
        this.data = cloneCategoryTree(cached);
        this.pagination =
          this.paginationByPage[cacheKey] ?? createEmptyPagination(page, size);
        this.descendantsByCategoryId = buildDescendantsIndex(this.data);
        this.isLoaded = true;
        return this.data;
      }

      if (pending) {
        const result = await pending;
        this.setCategoriesPage(result);
        return this.data;
      }

      this.isFetching = true;
      const request = categoryService.getAll({ page, size });
      inFlightCategoryPages.set(cacheKey, request);

      try {
        const result = await request;
        this.setCategoriesPage(result);
        return this.data;
      } finally {
        inFlightCategoryPages.delete(cacheKey);
        this.isFetching = false;
      }
    },

    async revalidateCategories(options?: ListQueryParams) {
      if (this.isFetching) {
        return;
      }

      const page = options?.page ?? this.pagination.page;
      const size = options?.size ?? this.pagination.size;

      try {
        const result = await categoryService.getAll({ page, size });
        this.setCategoriesPage(result);
      } catch {
        // Background refresh should not interrupt UX.
      }
    },

    async createCategory(payload: CreateCategoryRequest) {
      const created = await categoryService.create(payload);
      this.invalidate();
      await this.ensureCategories({
        force: true,
        page: 0,
        size: this.pagination.size || DEFAULT_PAGE_SIZE,
      });
      return created;
    },

    async updateCategory(categoryId: string, payload: CreateCategoryRequest) {
      const rollback = this.applyOptimisticCategoryUpdate(categoryId, payload);

      try {
        const updated = await categoryService.update(categoryId, payload);
        this.reconcileCategoryAfterMutation(updated);
        return updated;
      } catch (error) {
        rollback();
        throw error;
      }
    },

    async deleteCategory(categoryId: string) {
      const rollback = this.applyOptimisticCategoryRemove(categoryId);

      try {
        await categoryService.remove(categoryId);
        void this.revalidateCategories({
          page: this.pagination.page,
          size:
            this.pagination.size > 1 ? this.pagination.size : DEFAULT_PAGE_SIZE,
        });
      } catch (error) {
        rollback();
        throw error;
      }
    },
  },
});
