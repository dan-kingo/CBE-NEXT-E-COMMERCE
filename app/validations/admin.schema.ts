import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  slug: z.string().min(1, "Category slug is required"),
  description: z.string().optional(),
  parentId: z.coerce.number().int().positive().optional().nullable(),
});

export const tenantSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
});

export const bootstrapSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const subscriptionPlanSchema = z.object({
  code: z.string().min(1, "Plan code is required").max(50),
  name: z.string().min(1, "Plan name is required").max(120),
  price: z.coerce.number().min(0, "Price must be non-negative"),
  currency: z.string().length(3, "Currency must be 3 letters"),
  durationDays: z.coerce
    .number()
    .int()
    .min(1, "Duration must be at least 1 day"),
});

export const templateSchema = z.object({
  templateName: z.string().min(1, "Template name is required").max(120),
  previewImageUrl: z
    .string()
    .min(1, "Preview image URL is required")
    .url("Preview image URL must be a valid URL"),
});

export type CategoryInput = z.infer<typeof categorySchema>;
export type TenantInput = z.infer<typeof tenantSchema>;
export type BootstrapInput = z.infer<typeof bootstrapSchema>;
export type SubscriptionPlanInput = z.infer<typeof subscriptionPlanSchema>;
export type TemplateInput = z.infer<typeof templateSchema>;
