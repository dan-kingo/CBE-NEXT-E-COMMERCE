import { z } from "zod";
import { email } from "zod/v4";

export const apiStatusSchema = z.object({
  code: z.number(),
  message: z.string(),
});

export const authTokenSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
});

export const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email"),
  password: z
    .string({ message: "Password must be at least 8 characters long." })
    .min(8)
    .regex(
      /^(?=.*[a-z])/,
      "Password must contain at least one lowercase letter",
    )
    .regex(/^(?=.*\d)/, "Password must contain at least one number"),
});

export const loginResponseSchema = z
  .object({
    status: apiStatusSchema.optional(),
    token: authTokenSchema.optional(),
    role: z.string().optional(),
    data: z
      .object({
        token: authTokenSchema.optional(),
        role: z.string().optional(),
      })
      .optional(),
  })
  .passthrough();

export const authProfileSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  role: z.string(),
});

export const profileResponseSchema = z
  .object({
    status: apiStatusSchema.optional(),
    profile: authProfileSchema.optional(),
    data: z
      .object({
        profile: authProfileSchema.optional(),
      })
      .optional(),
  })
  .passthrough();

export type LoginInput = z.infer<typeof loginSchema>;
