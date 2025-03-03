import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Router } from "express";
import { z } from "zod";

import { createApiResponse } from "@/api-docs/openAPIResponseBuilders";
import { GetElizaRequestSchema, ElizaResponseSchema } from "@/api/eliza/elizaModel";
import { validateRequest } from "@/common/utils/httpHandlers";
import { elizaController } from "./elizaController";

export const elizaRegistry = new OpenAPIRegistry();
export const elizaRouter: Router = express.Router();

elizaRegistry.register("Eliza", ElizaResponseSchema);

elizaRegistry.registerPath({
  method: "post",
  path: "/eliza/chat",
  tags: ["Eliza"],
  request: {
    body: {
      content: {
        'application/json': {
          schema: GetElizaRequestSchema
        }
      }
    }
  },
  responses: createApiResponse(z.array(ElizaResponseSchema), "Success"),
});

elizaRouter.post("/chat", elizaController.chat);

