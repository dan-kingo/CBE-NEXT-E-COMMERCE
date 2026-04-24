export interface CreatePlanRequest {
  code: string;
  name: string;
  price: number;
  currency: string;
  durationDays: number;
}

export interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  price: number;
  currency: string;
  durationDays: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
