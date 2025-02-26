import { PGVectorStore } from '@langchain/community/vectorstores/pgvector';
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { Embeddings } from "@langchain/core/embeddings";
import { VectorStore } from "@langchain/core/vectorstores";

export enum VectorStoreProvider {
    MEMORY = "MEMORY",
    PGVECTOR = "PGVECTOR",
}

export interface VectorStoreConfig {
    provider: VectorStoreProvider;
    connectionConfig?: {
        url?: string;
        apiKey?: string;
        postgresConnectionOptions?: any;
        tableName?: string;
        queryName?: string;
    };
}

export class VectorStoreManager {
    private vectorStore!: VectorStore;
    private vectorStoreConfig: VectorStoreConfig;
    private embedder: Embeddings;
    private initialized: boolean = false;

    constructor(vectorStoreConfig: VectorStoreConfig, embedder: Embeddings) {
        this.vectorStoreConfig = vectorStoreConfig;
        this.embedder = embedder;
    }

    public async init(): Promise<void> {
        if (this.initialized) {
            return;
        }

        // Initialize vector store based on provider
        switch (this.vectorStoreConfig.provider) {
            case VectorStoreProvider.MEMORY:
                this.vectorStore = new MemoryVectorStore(this.embedder);
                break;
            
            case VectorStoreProvider.PGVECTOR:
                if (!this.vectorStoreConfig.connectionConfig?.url && 
                    !this.vectorStoreConfig.connectionConfig?.apiKey && 
                    !this.vectorStoreConfig.connectionConfig?.postgresConnectionOptions) {
                    throw new Error("PGVector requires connection configuration");
                }
                
                this.vectorStore = await PGVectorStore.initialize(
                    this.embedder, 
                    {
                        postgresConnectionOptions: this.vectorStoreConfig.connectionConfig.postgresConnectionOptions,
                        tableName: this.vectorStoreConfig.connectionConfig.tableName as string,
                    }
                );
                break;
            
            default:
                throw new Error(`Unsupported vector store provider: ${this.vectorStoreConfig.provider}`);
        }

        this.initialized = true;
    }

    public getVectorStore(): VectorStore {
        if (!this.initialized) {
            throw new Error("VectorStoreManager not initialized. Call init() first.");
        }
        return this.vectorStore;
    }

    public getRetriever() {
        if (!this.initialized) {
            throw new Error("VectorStoreManager not initialized. Call init() first.");
        }
        return this.vectorStore.asRetriever();
    }

    public isInitialized(): boolean {
        return this.initialized;
    }
}