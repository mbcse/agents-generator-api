import { Embeddings } from "@langchain/core/embeddings";
import { OpenAIEmbeddings } from "@langchain/openai";

export enum EmbeddingProvider {
    OPENAI = "OPENAI",
}

export interface EmbeddingConfig {
    provider: EmbeddingProvider;
    apiKey: string;
    modelName?: string;
}

export class EmbeddingManager {
    private static instance: EmbeddingManager | null = null;
    private embedder: Embeddings;

    private constructor(config: EmbeddingConfig) {
        switch (config.provider) {
            case EmbeddingProvider.OPENAI:
                this.embedder = new OpenAIEmbeddings({ 
                    openAIApiKey: config.apiKey,
                    modelName: config.modelName
                });
                break;
            default:
                throw new Error(`Unsupported embedding provider: ${config.provider}`);
        }
    }

    public static getInstance(config: EmbeddingConfig): EmbeddingManager {
        if (!EmbeddingManager.instance) {
            EmbeddingManager.instance = new EmbeddingManager(config);
        }
        return EmbeddingManager.instance;
    }

    public getEmbedder(): Embeddings {
        return this.embedder;
    }
}
