import { z } from "zod";

export const createSubscriptionPlanSchema = z.object({
  code: z.string().min(1, "Plan code is required").max(50),
  name: z.string().min(1, "Plan name is required").max(120),
  price: z.coerce.number().min(0, "Price must be non-negative"),
  currency: z.string().length(3, "Currency must be 3 letters"),
  durationDays: z.coerce
    .number()
    .int()
    .min(1, "Duration must be at least 1 day"),
});

export type CreateSubscriptionPlanInput = z.infer<
  typeof createSubscriptionPlanSchema
>;
