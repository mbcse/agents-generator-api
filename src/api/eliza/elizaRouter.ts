import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Router } from "express";
import { z } from "zod";

import { createApiResponse } from "@/api-docs/openAPIResponseBuilders";
import { GetElizaRequestSchema, ElizaResponseSchema, InitSessionRequestSchema, InitSessionResponseSchema } from "@/api/eliza/elizaModel";
import { validateRequest } from "@/common/utils/httpHandlers";
import { elizaController } from "./elizaController";

export const elizaRegistry = new OpenAPIRegistry();
export const elizaRouter: Router = express.Router();

elizaRegistry.register("Eliza", ElizaResponseSchema);
elizaRegistry.register("InitSession", InitSessionResponseSchema);

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

elizaRegistry.registerPath({
  method: "post",
  path: "/eliza/init-session",
  tags: ["Eliza"],
  request: {
    body: {
      content: {
        'application/json': {
          schema: InitSessionRequestSchema
        }
      }
    }
  },
  responses: createApiResponse(InitSessionResponseSchema, "Success"),
});

elizaRouter.post("/chat", elizaController.chat);
elizaRouter.post("/init-session", elizaController.initSession);

