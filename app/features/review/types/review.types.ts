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

export interface PaginatedListResult<T> {
  content: T[];
  pagination: PaginationMeta;
}

export interface ListQueryParams {
  page?: number;
  size?: number;
}

export type ReviewModerationStatus = "PUBLISHED" | "PENDING" | "REJECTED";
export type ReviewVisibilityStatus = "VISIBLE" | "HIDDEN";
export type AdminReviewDecisionAction = "PUBLISH" | "REJECT";

export interface ReviewResponse {
  id: number;
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
  storeId?: number;
  productId?: number;
  moderationStatus?: ReviewModerationStatus;
  visibilityStatus?: ReviewVisibilityStatus;
}

export interface AdminReviewDecisionRequest {
  action: AdminReviewDecisionAction;
  rejectionReason?: string;
}
