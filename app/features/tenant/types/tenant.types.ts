export type UserRole = "CUSTOMER" | "TENANT" | "ADMIN";

export type TenantProfileStatus =
  | "IN_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "ACTIVE"
  | "INACTIVE"
  | "SUSPENDED";

export interface CreateTenantRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

export interface UserResponse {
  id: string;
  email: string;
  tenantId?: string;
  role: UserRole;
  enabled: boolean;
  customerId?: string;
  customerFullName?: string;
  customerAddress?: string;
  customerPhoneNumber?: string;
  tenantProfileId?: number;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  fullName?: string;
  status?: TenantProfileStatus;
}

export interface UpdateTenantStatusRequest {
  status: TenantProfileStatus;
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
