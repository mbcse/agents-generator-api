import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";


export enum LLMProviders {
    OPENAI = "OPENAI",
    ANTHROPIC = "ANTHROPIC",
    DEEPSEEK = "DEEPSEEK"
}

export interface LLLModelConfig {
    provider: LLMProviders,
    apiKey: string,
    modelName?: string
}

export class LLMModelManager {
    private static _instance: LLMModelManager;
    private _llmModel: BaseChatModel;

    private constructor(config: LLLModelConfig) {
        if (!config.apiKey) {
            throw new Error("API key is required");
        }
        if (config.provider === LLMProviders.OPENAI) {
            this._llmModel = new ChatOpenAI({ apiKey: config.apiKey, modelName: config.modelName });
        } else if (config.provider === LLMProviders.ANTHROPIC) {
            this._llmModel = new ChatAnthropic({ apiKey: config.apiKey, modelName: config.modelName });
        } else if (config.provider === LLMProviders.DEEPSEEK) {
            this._llmModel = new ChatOpenAI({ apiKey: config.apiKey, modelName: config.modelName, configuration: {
                baseURL: "https://api.deepseek.com",
              } });
        } else {
            throw new Error("Invalid provider");
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

}