export interface TenantStats {
  total: number;
  newLast30Days: number;
  byStatus: Record<string, number>;
}

export interface CustomerStats {
  total: number;
  newLast30Days: number;
}

export interface StoreStats {
  total: number;
  byStatus: Record<string, number>;
}

export interface ProductStats {
  total: number;
  active: number;
  lowStock: number;
  outOfStock: number;
}

export interface OrderStats {
  total: number;
  paidOrFulfilled: number;
  revenueTotal: number;
  averageOrderValue: number;
  byStatus: Record<string, number>;
}

export interface PlanBreakdown {
  planId: string;
  planName: string;
  activeCount: number;
}

export interface SubscriptionStats {
  activeCount: number;
  expiringIn7Days: number;
  expiringIn30Days: number;
  activeByPlan: PlanBreakdown[];
}

export interface MonthlyRevenuePoint {
  month: string;
  total: number;
}

export interface TopTenantRevenue {
  tenantId: string;
  tenantName: string;
  total: number;
}

export interface AdminOverviewResponse {
  tenants: TenantStats;
  customers: CustomerStats;
  stores: StoreStats;
  products: ProductStats;
  orders: OrderStats;
  subscriptions: SubscriptionStats;
  revenueByMonth: MonthlyRevenuePoint[];
  topTenantsByRevenue: TopTenantRevenue[];
}
