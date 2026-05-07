export type UserRole = "CUSTOMER" | "TENANT" | "ADMIN" | "SUPERADMIN";

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
}

export interface CreateUserRequest {
  email: string;
  password: string;
  role: UserRole;
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

export interface MediaFileResponse {
  secureUrl: string;
  resourceType: string;
  extension: string;
  bytes: number;
  width: number;
  height: number;
  originalFilename: string;
}

export interface MediaUploadResponse {
  status: ApiStatus;
  data: MediaFileResponse;
}
