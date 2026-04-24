import { z } from "zod";

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

export const templateSchema = z.object({
  templateName: z.string().min(1, "Template name is required").max(120),
  previewImageUrl: z
    .string()
    .min(1, "Preview image is required")
    .url("Preview image URL must be a valid URL"),
});

export type TenantInput = z.infer<typeof tenantSchema>;
export type BootstrapInput = z.infer<typeof bootstrapSchema>;
export type TemplateInput = z.infer<typeof templateSchema>;
