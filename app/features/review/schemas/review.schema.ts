import { z } from "zod";

const optionalPositiveNumber = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}, z.number().int().positive().optional());

export const reviewFiltersSchema = z.object({
  storeId: optionalPositiveNumber,
  productId: optionalPositiveNumber,
  moderationStatus: z.enum(["PENDING", "PUBLISHED", "REJECTED"]).optional(),
  visibilityStatus: z.enum(["VISIBLE", "HIDDEN"]).optional(),
});

export const createReviewDecisionSchema = z
  .object({
    action: z.enum(["PUBLISH", "REJECT"]),
    rejectionReason: z.string().trim().optional(),
  })
  .superRefine((value, context) => {
    if (value.action === "REJECT" && !value.rejectionReason) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rejectionReason"],
        message: "Rejection reason is required",
      });
    }
  });

export type ReviewFiltersInput = z.infer<typeof reviewFiltersSchema>;
export type ReviewDecisionInput = z.infer<typeof createReviewDecisionSchema>;
