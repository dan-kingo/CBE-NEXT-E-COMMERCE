export interface ProfileData {
  full_name: string;
  role: string;
}

export interface CategoryResponse {
  id: number;
  name: string;
  slug: string;
  description: string;
  parentId: number | null;
  children: CategoryResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryRequest {
  name: string;
  slug: string;
  description?: string;
  parentId?: number | null;
}

export interface CreateTenantRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

export type UserRole = "CUSTOMER" | "TENANT" | "ADMIN";

export interface UserResponse {
  id: number;
  email: string;
  tenantId?: string;
  role: UserRole;
  enabled: boolean;
  customerId?: number;
  customerFullName?: string;
  customerAddress?: string;
  customerPhoneNumber?: string;
  tenantProfileId?: number;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  fullName?: string;
}

export interface CreatePlanRequest {
  code: string;
  name: string;
  price: number;
  currency: string;
  durationDays: number;
}

export interface SubscriptionPlan {
  id: number;
  code: string;
  name: string;
  price: number;
  currency: string;
  durationDays: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  role: UserRole;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
}

export interface ApiStatus {
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

export interface PaginatedData<T> {
  content: T[];
  pagination: PaginationMeta;
}

export interface PaginatedApiResponse<T> {
  status: ApiStatus;
  data: PaginatedData<T>;
}

export interface PaginatedListResult<T> {
  content: T[];
  pagination: PaginationMeta;
}

export interface ListQueryParams {
  page?: number;
  size?: number;
}

export interface CustomerResponse {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  address: string | null;
}
