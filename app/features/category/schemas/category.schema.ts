import { z } from "zod";

export const apiStatusSchema = z.object({
  code: z.number(),
  message: z.string(),
});

export const paginationMetaSchema = z.object({
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
  totalPages: z.number(),
  numberOfElements: z.number(),
  first: z.boolean(),
  last: z.boolean(),
  hasNext: z.boolean(),
  hasPrevious: z.boolean(),
  empty: z.boolean(),
});

export const createCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  slug: z.string().min(1, "Category slug is required"),
  description: z.string().optional(),
  parentId: z.number().int().positive().optional().nullable(),
});

export const categoryDtoSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    id: z.number(),
    name: z.string(),
    slug: z.string(),
    description: z
      .string()
      .nullable()
      .optional()
      .transform((v) => v ?? ""),
    parentId: z.number().nullable(),
    children: z.array(categoryDtoSchema).default([]),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
);

export const categoryListResponseSchema = z
  .object({
    status: apiStatusSchema.optional(),
    data: z
      .object({
        content: z.array(categoryDtoSchema),
        pagination: paginationMetaSchema,
      })
      .optional(),
  })
  .passthrough();

export const categoryResponseSchema = z
  .object({
    status: apiStatusSchema.optional(),
    data: categoryDtoSchema.optional(),
  })
  .passthrough();

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
