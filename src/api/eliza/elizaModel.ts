import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

import { commonValidations } from "@/common/utils/commonValidation";
import { CharacterSchema } from "@/common/ai/delilaElizaAgent/characterConfig";

extendZodWithOpenApi(z);

export type ElizaResponse = z.infer<typeof ElizaResponseSchema>;
export const ElizaResponseSchema = z.object({
  message: z.string(),
  characterFile: CharacterSchema,
});

// Input Validation for 'GET users/:id' endpoint
export const GetElizaRequestSchema = z.object({
  messages: z.array(z.object({
    content: z.string(),
    role: z.enum(["user", "assistant"]).optional()
  })),
  sessionId: z.string().optional()
});

// Schema for session initialization
export type InitSessionResponse = z.infer<typeof InitSessionResponseSchema>;
export const InitSessionResponseSchema = z.object({
  sessionId: z.string(),
  message: z.string().optional()
});

// Schema for session initialization request
export const InitSessionRequestSchema = z.object({
  // Optional initial message to start the conversation
  initialMessage: z.string().optional()
});