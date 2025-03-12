import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { HumanMessage } from "@langchain/core/messages";
import { P } from "pino";
import { LLLModelConfig, LLMModelManager, LLMProviders } from "../LLMModelManager";
import { EmbeddingConfig, EmbeddingManager, EmbeddingProvider } from "../EmbeddingManager";
import { VectorStoreConfig, VectorStoreManager } from "../VectorStoreManager";
import { RunnableSequence } from "@langchain/core/runnables";
import { elizaCharacterGeneratorSystemPrompt } from "../systemPromtTemplates/elizaCharacterGeneratorSystemPromt";
import { elizaReplyGeneratorSystemPrompt } from "../systemPromtTemplates/elizaReplyGeneratorSystemPrompt";
import { z } from "zod";
import { characterJsonSchema, CharacterSchema } from "./characterConfig";
import { IterableReadableStream } from '@langchain/core/utils/stream';

// Define types for the response streams
export type ReplyResponse = {
  type: 'reply';
  content: string;
};

export type CharacterFileResponse = {
  type: 'characterFile';
  content: any;
};

export type CombinedResponse = ReplyResponse | CharacterFileResponse;

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

  /**
   * Initialize the agent and prepare session data
   * @param sessionId Unique session identifier
   * @param userMessage The user's message
   * @returns Object containing message history and context
   */
  public async initializeSession(sessionId: string, userMessage: string): Promise<{ messageHistory: string, context: string }> {
    console.log(`[START] initializeSession - Session ID: ${sessionId}`);
    
    try {
      console.log(`[STEP 1] Initializing vector store`);
      await this.vectorStore.init();
      console.log(`[STEP 1] Vector store initialized successfully`);
      
      // Store message in session history
      console.log(`[STEP 2] Managing session messages`);
      if (!this.sessionMessages.has(sessionId)) {
        console.log(`[STEP 2] Creating new session for ID: ${sessionId}`);
        this.sessionMessages.set(sessionId, []);
      } else {
        console.log(`[STEP 2] Using existing session for ID: ${sessionId} with ${this.sessionMessages.get(sessionId)?.length || 0} messages`);
      }

      console.log(`[STEP 3] Processing user message: "${userMessage}"`);
      const currentMessage = new HumanMessage(userMessage);
      this.sessionMessages.get(sessionId)?.push(currentMessage);
      console.log(`[STEP 3] Added message to session history. Total messages: ${this.sessionMessages.get(sessionId)?.length || 0}`);

      // Fetch relevant context from vector store
      console.log(`[STEP 4] Fetching relevant context from vector store`);
      const relevantDocs = await this.vectorStore.getVectorStore().similaritySearch(userMessage, 3);
      console.log(`[STEP 4] Found ${relevantDocs.length} relevant documents`);
      
      const context = relevantDocs.map(doc => doc.pageContent).join('\n');
      console.log(`[STEP 4] Context length: ${context.length} characters`);
      
      if (relevantDocs.length > 0) {
        console.log(`[STEP 4] First document metadata:`, relevantDocs[0].metadata);
      }

      // Create message history string
      console.log(`[STEP 5] Creating message history string`);
      const messageHistory = this.sessionMessages.get(sessionId)
        ?.map(msg => msg.content)
        .join('\n') || '';
      console.log(`[STEP 5] Message history length: ${messageHistory.length} characters`);

      return { messageHistory, context };
    } catch (error) {
      console.error(`[ERROR] Exception in initializeSession:`, error);
      throw error;
    }
  }

  /**
   * Generate a conversational reply to the user's message
   * @param sessionId Unique session identifier
   * @param userMessage The user's message
   * @param messageHistory Previous conversation history
   * @param context Relevant context from vector store
   * @returns Stream of reply chunks
   */
  public async generateReply(sessionId: string, userMessage: string, messageHistory: string, context: string): Promise<IterableReadableStream<any>> {
    console.log(`[REPLY] Generating reply for session ${sessionId}`);

    console.log(messageHistory);
    
    // Create a parser for the reply
    const ReplySchema = z.object({
      reply: z.string()
    });
    
    const replyParser = StructuredOutputParser.fromZodSchema(ReplySchema);
    
    // Create the reply chain
    const replyChain = RunnableSequence.from([
      {
        messageHistory: (input) => messageHistory,
        context: (input) => context,
        formatInstructions: (input) => replyParser.getFormatInstructions(),
      },
      elizaReplyGeneratorSystemPrompt,
      this.llm.getModel(),
      replyParser
    ]);
    
    console.log(`[REPLY] Reply chain created, starting stream`);
    return replyChain.stream(userMessage);
  }
  
  /**
   * Generate a character file based on the conversation
   * @param sessionId Unique session identifier
   * @param userMessage The user's message
   * @param messageHistory Previous conversation history
   * @param context Relevant context from vector store
   * @returns Stream of character file chunks
   */
  public async generateCharacterFile(sessionId: string, userMessage: string, messageHistory: string, context: string): Promise<IterableReadableStream<any>> {
    console.log(`[CHARACTER] Generating character file for session ${sessionId}`);
    
    try {
      // Create a parser for the character file
      const parser = StructuredOutputParser.fromZodSchema(CharacterSchema);
      
      // Create the character file chain
      const characterChain = RunnableSequence.from([
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
      
      console.log(`[CHARACTER] Character chain created, starting stream`);
      return characterChain.stream(userMessage);
    } catch (error) {
      console.error(`[CHARACTER] Error setting up character file generation:`, error);
      throw error;
    }
  }

  // Process the stream in the background to log its contents
  private async logStreamContents(stream: IterableReadableStream<any>): Promise<void> {
    let chunkCount = 0;
    let objectChunks = 0;
    let stringChunks = 0;
    let totalStringLength = 0;
    
    try {
      console.log(`[STREAM_BG] Starting to process stream chunks in background`);
      
      // Create a clone of the stream to process in the background
      const streamClone = stream[Symbol.asyncIterator]();
      
      // Process each chunk
      while (true) {
        const { value, done } = await streamClone.next();
        
        if (done) {
          break;
        }
        
        const chunk = value;
        chunkCount++;
        
        if (typeof chunk === 'object') {
          objectChunks++;
          console.log(`[STREAM_BG] Chunk #${chunkCount} is an object:`, JSON.stringify(chunk));
        } else {
          stringChunks++;
          totalStringLength += String(chunk).length;
          console.log(`[STREAM_BG] Chunk #${chunkCount} is a string of length ${String(chunk).length}`);
          if (String(chunk).length < 500) {
            console.log(`[STREAM_BG] String content: "${String(chunk)}"`);
          } else {
            console.log(`[STREAM_BG] String content (truncated): "${String(chunk).substring(0, 200)}..."`);
          }
        }
      }
      
      console.log(`[STREAM_BG] Stream completed. Total chunks: ${chunkCount} (${objectChunks} objects, ${stringChunks} strings, total string length: ${totalStringLength})`);
    } catch (error) {
      console.error(`[STREAM_BG] Error processing stream:`, error);
    }
  }

  // Static factory method
  public static async create(
    modelConfig: LLLModelConfig,
    embeddingConfig: EmbeddingConfig,
    vectorStoreConfig: VectorStoreConfig
  ): Promise<ElizaGeneratorAgent> {
    console.log(`[FACTORY] Creating new ElizaGeneratorAgent instance`);
    return new ElizaGeneratorAgent(modelConfig, embeddingConfig, vectorStoreConfig);
  }
}