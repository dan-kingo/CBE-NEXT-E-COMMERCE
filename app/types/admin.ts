export interface CategoryResponse {
  id: number;
  name: string;
  slug: string;
  description: string;
  parentId: string | null;
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
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  address: string | null;
}

export interface CreateTemplateRequest {
  templateName: string;
  previewImageUrl: string;
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

export interface TemplatePatchRequest {
  templateName?: string;
  previewImageUrl?: string;
}

export interface TemplateResponse {
  id: string;
  templateName: string;
  previewImageUrl: string;
  createdAt: string;
  updatedAt: string;
}

export type ReviewModerationStatus = "PUBLISHED" | "PENDING" | "REJECTED";
export type ReviewVisibilityStatus = "VISIBLE" | "HIDDEN";
export type AdminReviewDecisionAction = "PUBLISH" | "REJECT";

export interface ReviewResponse {
  id: string;
  tenantId: string;
  storeId: string;
  productId: string;
  userId: string;
  authorName: string;
  rating: number;
  title: string;
  summary: string;
  comment: string;
  imageUrls: string[];
  moderationStatus: ReviewModerationStatus;
  visibilityStatus: ReviewVisibilityStatus;
  rejectionReason?: string | null;
  reportCount: number;
  contentVisible: boolean;
  statusMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewSummaryResponse {
  averageRating: number;
  totalPublishedReviews: number;
  ratingBreakdown: Record<string, number>;
}

export interface ReviewListResponse {
  content: ReviewResponse[];
  pagination: PaginationMeta;
  summary: ReviewSummaryResponse;
}

export interface ReviewListQueryParams extends ListQueryParams {
  tenantId?: string;
  storeId?: string;
  productId?: string;
  moderationStatus?: ReviewModerationStatus;
  visibilityStatus?: ReviewVisibilityStatus;
}

export interface AdminReviewDecisionRequest {
  action: AdminReviewDecisionAction;
  rejectionReason?: string;
}
