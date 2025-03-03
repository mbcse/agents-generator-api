import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { HumanMessage } from "@langchain/core/messages";
import { P } from "pino";
import { LLLModelConfig, LLMModelManager, LLMProviders } from "../LLMModelManager";
import { EmbeddingConfig, EmbeddingManager, EmbeddingProvider } from "../EmbeddingManager";
import { VectorStoreConfig, VectorStoreManager } from "../VectorStoreManager";
import { RunnableSequence } from "@langchain/core/runnables";
import { elizaCharacterGeneratorSystemPrompt } from "../systemPromtTemplates/elizaCharacterGeneratorSystemPromt";
import { z } from "zod";
import { characterJsonSchema, CharacterSchema } from "./characterConfig";
import { IterableReadableStream } from '@langchain/core/dist/utils/stream';


export class ElizaGeneratorAgent {
  private llm: LLMModelManager;
  private embedder: EmbeddingManager;
  private vectorStore: VectorStoreManager;
  private sessionMessages: Map<string, HumanMessage[]> = new Map();

  private constructor(modelConfig: LLLModelConfig, embeddingConfig: EmbeddingConfig, vectorStoreConfig: VectorStoreConfig) {
    this.llm = LLMModelManager.getInstance(modelConfig);
    this.embedder = EmbeddingManager.getInstance(embeddingConfig);
    this.vectorStore = new VectorStoreManager(vectorStoreConfig, this.embedder.getEmbedder());
  }

  public async generateCharacterFile(sessionId: string, userMessage: string): Promise<IterableReadableStream<any>> {
    await this.vectorStore.init();
    // Store message in session history
    if (!this.sessionMessages.has(sessionId)) {
      this.sessionMessages.set(sessionId, []);
    }
    const currentMessage = new HumanMessage(userMessage);
    this.sessionMessages.get(sessionId)?.push(currentMessage);

    // Fetch relevant context from vector store
    const relevantDocs = await this.vectorStore.getVectorStore().similaritySearch(userMessage, 3);
    const context = relevantDocs.map(doc => doc.pageContent).join('\n');

    // Create message history string
    const messageHistory = this.sessionMessages.get(sessionId)
      ?.map(msg => msg.content)
      .join('\n') || '';

      // Create a combined schema for character file and reply message
      const CombinedResponseSchema = z.object({
        characterFile: CharacterSchema,
        replyMessage: z.string()
      });

      const parser = StructuredOutputParser.fromZodSchema(
        CombinedResponseSchema
      );

      // console.log(parser.getFormatInstructions());



    const agentChain = RunnableSequence.from([
      {
        messageHistory: (input) => messageHistory,
        context: (input) => context,
        characterJsonSchema: (input) => characterJsonSchema,
        formatInstructions: (input) => parser.getFormatInstructions(),
      },
      elizaCharacterGeneratorSystemPrompt,
      this.llm.getModel(),
      parser
    ]);

    // Stream the response
    const stream = await agentChain.stream(userMessage);
    let fullResponse = '';
    let parsedResponse: any = null;
    
    // for await (const chunk of stream) {
    //   // Accumulate the response
    //   if (typeof chunk === 'object') {
    //     parsedResponse = chunk;
    //   } else {
    //     fullResponse += chunk;
    //   }
    // }

    return stream;

    // try {
    //   // console.log("Full response:", fullResponse);
    //   // console.log("Parsed response:", parsedResponse);
      
    //   // If we have a parsed response object, use it directly
    //   if (parsedResponse && parsedResponse.characterFile && parsedResponse.replyMessage) {
    //     return {
    //       characterFile: parsedResponse.characterFile,
    //       reply: parsedResponse.replyMessage
    //     };
    //   }
      
      // // Otherwise try to parse the string response
      // const jsonResponse = JSON.parse(fullResponse);
      // return {
      //   characterFile: jsonResponse.characterFile,
      //   reply: jsonResponse.replyMessage || "I've created a character file based on your requirements. Let me know if you'd like to make any adjustments!"
      // };
    // } catch (error) {
    //   // console.error("Error parsing LLM response:", error);
    //   // throw new Error('Failed to generate valid character file');
    //   return{
    //     characterFile: null,
    //     reply: fullResponse
    //   }
    // }
  }

  // Static factory method
  public static async create(
    modelConfig: LLLModelConfig,
    embeddingConfig: EmbeddingConfig,
    vectorStoreConfig: VectorStoreConfig
  ): Promise<ElizaGeneratorAgent> {
    return new ElizaGeneratorAgent(modelConfig, embeddingConfig, vectorStoreConfig);
  }
}