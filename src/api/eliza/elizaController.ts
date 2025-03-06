import type { Request, RequestHandler, Response } from "express";

import { elizaService } from "@/api/eliza/elizaService";
import { handleServiceResponse } from "@/common/utils/httpHandlers";
import { ElizaGeneratorAgent } from "@/common/ai/delilaElizaAgent/AgentServer";
import { LLLModelConfig, LLMProviders } from "@/common/ai/LLMModelManager";
import { EmbeddingConfig, EmbeddingProvider } from "@/common/ai/EmbeddingManager";
import { VectorStoreConfig, VectorStoreProvider } from "@/common/ai/VectorStoreManager";
import { LangChainAdapter } from 'ai';

const modelConfig: LLLModelConfig = {
  provider: LLMProviders.ANTHROPIC,
  apiKey: process.env.ANTHROPIC_API_KEY || '',
  modelName: "claude-3-5-sonnet-20240620",
};
const embeddingConfig: EmbeddingConfig = {
  provider: EmbeddingProvider.OPENAI,
  apiKey: process.env.OPENAI_API_KEY || '',
  modelName: "text-embedding-3-large",
};
const vectorStoreConfig: VectorStoreConfig = {
  provider: VectorStoreProvider.PGVECTOR,
  connectionConfig: {
    postgresConnectionOptions: {
      type: "postgres",
      host: "127.0.0.1",
      port: 5432,
      user: "test",
      password: "test",
      database: "api",
    },
    tableName: "delila_eliza",
  },
};


class ElizaController {
  public chat: RequestHandler = async (req: Request, res: Response) => {
    const elizaAgentServer = await ElizaGeneratorAgent.create(modelConfig, embeddingConfig, vectorStoreConfig);
    const { message } = req.body;
    console.log(message);
    const streamResponse = await elizaAgentServer.generateCharacterFile("1234", message);
    // return res.status(200).json(response);
    return LangChainAdapter.toDataStreamResponse(streamResponse);
  };

}

export const elizaController = new ElizaController();
