export interface ApiStatusDTO {
  code: number;
  message: string;
}

export interface PaginationMeta {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  numberOfElements: number;
  first: boolean;
  last: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
  empty: boolean;
}

export interface PaginatedListResult<T> {
  content: T[];
  pagination: PaginationMeta;
}

export interface ListQueryParams {
  page?: number;
  size?: number;
}

export interface CategoryDTO {
  id: string;
  name: string;
  slug: string;
  description: string;
  parentId: string | null;
  children: CategoryDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  parentId: string | null;
  children: Category[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryRequest {
  name: string;
  slug: string;
  description?: string;
  parentId?: string | null;
}
