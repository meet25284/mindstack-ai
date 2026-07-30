import z from "zod"


export const registerValidater = z.object({
  name: z
    .string()
    .trim(),

  email: z
    .string()
    .email({ message: "Please enter a valid email" })
    .trim(),

  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" })
    .trim(),
});

export const LoginValidater = z.object({
    email: z
      .string()
      .email({ message: "Please enter a valid email" })
      .trim(),
  
    password: z
      .string()
      .min(8, { message: "Password must be at least 8 characters" })
      .trim(),
  
  });

/**
 * Validates the request body for POST /api/chat.
 * prompt  — required, 1–4000 chars.
 * threadId — optional string (omit or "new" for a fresh thread).
 */
export const chatRequestValidator = z.object({
  prompt: z
    .string({ required_error: "prompt is required" })
    .trim()
    .min(1, { message: "prompt cannot be empty" })
    .max(4000, { message: "prompt cannot exceed 4000 characters" }),

  threadId: z
    .string()
    .trim()
    .optional(),
});