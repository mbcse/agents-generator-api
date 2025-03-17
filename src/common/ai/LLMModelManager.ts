import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { bindToolsToModel } from "./delilaElizaAgent/AgentTools";

export enum LLMProviders {
    OPENAI = "OPENAI",
    ANTHROPIC = "ANTHROPIC",
    DEEPSEEK = "DEEPSEEK"
}

export interface LLLModelConfig {
    provider: LLMProviders,
    apiKey: string,
    modelName?: string,
    enableTools?: boolean
}

export class LLMModelManager {
    private static _instance: LLMModelManager;
    private _llmModel: BaseChatModel;
    private _enableTools: boolean;

    private constructor(config: LLLModelConfig) {
        if (!config.apiKey) {
            throw new Error("API key is required");
        }

        this._enableTools = config.enableTools ?? false;
        let model: BaseChatModel;

        if (config.provider === LLMProviders.OPENAI) {
            model = new ChatOpenAI({ apiKey: config.apiKey, modelName: config.modelName });
        } else if (config.provider === LLMProviders.ANTHROPIC) {
            model = new ChatAnthropic({ apiKey: config.apiKey, modelName: config.modelName });
        } else if (config.provider === LLMProviders.DEEPSEEK) {
            model = new ChatOpenAI({ 
                apiKey: config.apiKey, 
                modelName: config.modelName, 
                configuration: {
                    baseURL: "https://api.deepseek.com",
                }
            });
        } else {
            throw new Error("Invalid provider");
        }

        // Bind tools to the model if enabled
        if (this._enableTools) {
            console.log(`[LLM] Binding tools to ${config.provider} model`);
            this._llmModel = bindToolsToModel(model);
        } else {
            this._llmModel = model;
        }
    }

    static getInstance(config: LLLModelConfig): LLMModelManager {
        if (!LLMModelManager._instance) {
            LLMModelManager._instance = new LLMModelManager(config);
        }
        return LLMModelManager._instance;
    }

    getModel(): BaseChatModel {
        return this._llmModel;
    }

    /**
     * Check if tools are enabled for this model
     * @returns True if tools are enabled, false otherwise
     */
    areToolsEnabled(): boolean {
        return this._enableTools;
    }

    /**
     * Enable tools for this model instance
     * This will recreate the model with tools enabled
     */
    enableTools(): void {
        if (!this._enableTools) {
            this._enableTools = true;
            this._llmModel = bindToolsToModel(this._llmModel);
            console.log('[LLM] Tools enabled for model');
        }
    }

    /**
     * Disable tools for this model instance
     * Note: This doesn't actually remove the tools, it just marks them as disabled
     */
    disableTools(): void {
        if (this._enableTools) {
            this._enableTools = false;
            console.log('[LLM] Tools disabled for model');
        }
    }
}