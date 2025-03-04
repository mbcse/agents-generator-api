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
  content: z.object({
    message: z.string()
  })
});