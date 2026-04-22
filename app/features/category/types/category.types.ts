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
  id: number;
  name: string;
  slug: string;
  description: string;
  parentId: number | null;
  children: CategoryDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  parentId: number | null;
  children: Category[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryRequest {
  name: string;
  slug: string;
  description?: string;
  parentId?: number | null;
}
