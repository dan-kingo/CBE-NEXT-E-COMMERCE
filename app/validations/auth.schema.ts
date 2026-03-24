import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email"),
  password: z
    .string()
    .min(8)
    .regex(
      /^(?=.*[a-z])/,
      "Password must contain at least one lowercase letter",
    )

    .regex(/^(?=.*\d)/, "Password must contain at least one number")
    
});

export type LoginInput = z.infer<typeof loginSchema>;
