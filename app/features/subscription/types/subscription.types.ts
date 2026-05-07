export interface CreatePlanRequest {
  name: string;
  price: number;
  currency: string;
  durationDays: number;
  maxStores: number;
}

export interface UpdatePlanRequest {
  name?: string;
  price?: number;
  currency?: string;
  durationDays?: number;
  maxStores?: number;
  active?: boolean;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  durationDays: number;
  maxStores: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionPlanStats {
  id: string;
  name: string;
  totalPurchases: number;
  activeTenants: number;
}

export interface AssignTenantSubscriptionRequest {
  planId: string;
}

export interface SubscriptionPlanQueryRequest {
  page?: number;
  size?: number;
  search?: string;
  active?: boolean;
}
