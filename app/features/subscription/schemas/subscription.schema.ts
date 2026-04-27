import { z } from "zod";

export const createSubscriptionPlanSchema = z.object({
  name: z.string().min(1, "Plan name is required").max(120),
  price: z.coerce.number().min(0, "Price must be non-negative"),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .length(3, "Currency must be 3 letters"),
  durationDays: z.coerce
    .number()
    .int()
    .min(1, "Duration must be at least 1 day"),
});

export const updateSubscriptionPlanSchema = createSubscriptionPlanSchema
  .partial()
  .extend({
    active: z.boolean().optional(),
  });

export type CreateSubscriptionPlanInput = z.infer<
  typeof createSubscriptionPlanSchema
>;

export type UpdateSubscriptionPlanInput = z.infer<
  typeof updateSubscriptionPlanSchema
>;
