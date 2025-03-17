import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { OutputFixingParser } from "langchain/output_parsers";

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
import { DatabaseService } from '../../../database';
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";

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
  private db: DatabaseService;

  private constructor(modelConfig: LLLModelConfig, embeddingConfig: EmbeddingConfig, vectorStoreConfig: VectorStoreConfig) {
    // Enable tools by default for the LLM
    const configWithTools: LLLModelConfig = {
      ...modelConfig,
      enableTools: true
    };
    
    this.llm = LLMModelManager.getInstance(configWithTools);
    this.embedder = EmbeddingManager.getInstance(embeddingConfig);
    this.vectorStore = new VectorStoreManager(vectorStoreConfig, this.embedder.getEmbedder());
    this.db = DatabaseService.getInstance();
    
    console.log(`[AGENT] Created ElizaGeneratorAgent with tools ${this.llm.areToolsEnabled() ? 'enabled' : 'disabled'}`);
  }

  /**
   * Initialize the agent and prepare session data
   * @param sessionId Unique session identifier
   * @param userMessage The user's message
   * @returns Object containing message history, context, and character file
   */
  public async initializeSession(sessionId: string, userMessage: string): Promise<{ messageHistory: string, context: string, sessionId: string, characterFile: any }> {
    console.log(`[START] initializeSession - Session ID: ${sessionId}`);
    
    try {
      console.log(`[STEP 1] Initializing vector store`);
      await this.vectorStore.init();
      console.log(`[STEP 1] Vector store initialized successfully`);
      
      // Ensure database connection
      await this.db.connect();
      
      // Get or create session
      let session = await this.db.sessions.getSessionById(sessionId);
      if (!session) {
        console.log(`[STEP 2] Creating new session in database for ID: ${sessionId}`);
        session = await this.db.sessions.createSession();
      } else {
        console.log(`[STEP 2] Found existing session in database for ID: ${sessionId}`);
      }
      
      // Store message in database
      console.log(`[STEP 3] Processing user message: "${userMessage}"`);
      await this.db.messages.createMessage({
        content: userMessage,
        role: 'user',
        sessionId: session.id,
      });
      
      console.log(`[STEP 3] Added message to database`);

      // Fetch relevant context from vector store
      console.log(`[STEP 4] Fetching relevant context from vector store`);
      const relevantDocs = await this.vectorStore.getVectorStore().similaritySearch(userMessage, 3);
      console.log(`[STEP 4] Found ${relevantDocs.length} relevant documents`);
      
      const context = relevantDocs.map(doc => doc.pageContent).join('\n');
      console.log(`[STEP 4] Context length: ${context.length} characters`);
      
      if (relevantDocs.length > 0) {
        console.log(`[STEP 4] First document metadata:`, relevantDocs[0].metadata);
      }

      // Create message history string from database (excluding the current message)
      console.log(`[STEP 5] Creating message history string from database`);
      const dbMessages = await this.db.messages.getMessagesBySessionId(session.id);
      
      // Remove the last message (current user message) from history
      const previousMessages = dbMessages.slice(0, dbMessages.length);
      
      // Format message history as "User Message: content" or "Assistant Message: content"
      const messageHistory = previousMessages.map(msg => {
        const roleLabel = msg.role === 'user' ? 'User Message' : 'Assistant Message';
        return `${roleLabel}: ${msg.content}`;
      }).join('\n');
      
      console.log(`[STEP 5] Message history length: ${messageHistory.length} characters`);

      // Fetch current character file from database
      console.log(`[STEP 6] Fetching current character file from database`);
      let characterFile = await this.db.characterFiles.getCharacterFileBySessionId(session.id);
      if (!characterFile) {
        console.log(`[STEP 6] No character file found, creating empty template`);
        characterFile = {
          name: "",
          bio: [],
          lore: [],
          knowledge: [],
          messageExamples: [],
          postExamples: [],
          topics: [],
          style: {
            all: [],
            chat: [],
            post: []
          },
          adjectives: [],
          clients: [],
          plugins: [],
          modelProvider: "",
          settings: {
            secrets: {},
            voice: {
              model: "en_US-male-medium"
            }
          }
        };
      } else {
        console.log(`[STEP 6] Found existing character file`);
      }

      return { messageHistory, context, sessionId: session.id, characterFile };
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
   * @param characterFile Current character file
   * @returns Stream of reply chunks
   */
  public async generateReply(sessionId: string, userMessage: string, messageHistory: string, context: string, characterFile: any): Promise<IterableReadableStream<any>> {
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
        characterFile: (input) => JSON.stringify(characterFile, null, 2),
        formatInstructions: (input) => replyParser.getFormatInstructions(),
      },
      elizaReplyGeneratorSystemPrompt,
      this.llm.getModel(),
      replyParser
    ]);
    
    console.log(`[REPLY] Reply chain created, starting stream`);
    const stream = await replyChain.stream(userMessage);
    
    // Add debug logging
    return this.addStreamLogging(stream, '[REPLY_STREAM]');
  }
  
  /**
   * Generate a character file based on the conversation
   * @param sessionId Unique session identifier
   * @param userMessage The user's message
   * @param messageHistory Previous conversation history
   * @param context Relevant context from vector store
   * @param characterFile Current character file
   * @returns Stream of character file chunks
   */
  public async generateCharacterFile(sessionId: string, userMessage: string, messageHistory: string, context: string, characterFile: any): Promise<IterableReadableStream<any>> {
    console.log(`[CHARACTER] Generating character file for session ${sessionId}`);
    
    try {
      // Create a parser for the character file
      const parser = StructuredOutputParser.fromZodSchema(CharacterSchema);
      
      // Create an output fixing parser to handle potential parsing errors
      const fixingParser = OutputFixingParser.fromLLM(
        this.llm.getModel(),
        parser
      );
      
      // Create a JSON validator prompt
      const jsonValidatorPrompt = ChatPromptTemplate.fromTemplate(`
        You are a JSON validator and repair expert. Your task is to validate and fix the following JSON object 
        to ensure it conforms to the required schema for a character file.
        
        Here is the JSON schema that the object should conform to:
        {characterJsonSchema}
        
        Here is the JSON object to validate and fix:
        {jsonObject}
        
        If the JSON is valid and conforms to the schema, return it unchanged.
        If the JSON has syntax errors or doesn't conform to the schema, fix it and return the corrected version.
        
        Return ONLY the fixed JSON object, with no additional explanation or commentary.
        The output must be valid JSON that can be parsed with JSON.parse().
      `);
      
      // Create a JSON validator function
      const validateJson = async (characterData: any) => {
        console.log(`[CHARACTER] Validating JSON`);
        const jsonString = JSON.stringify(characterData, null, 2);
        
        const jsonValidatorChain = RunnableSequence.from([
          {
            characterJsonSchema: () => characterJsonSchema,
            jsonObject: () => jsonString
          },
          jsonValidatorPrompt,
          this.llm.getModel(),
          new StringOutputParser()
        ]);
        
        console.log(`[CHARACTER] Running JSON validation chain`);
        const validatedJsonString = await jsonValidatorChain.invoke({});
        
        try {
          // Parse the validated JSON
          const validatedJson = JSON.parse(validatedJsonString);
          console.log(`[CHARACTER] JSON validation complete`);
          return validatedJson;
        } catch (parseError) {
          console.error(`[CHARACTER] Failed to parse validated JSON: ${parseError}`);
          // If we can't parse it, return the original
          return characterData;
        }
      };
      
      // Create the character file chain with validation
      const characterChain = RunnableSequence.from([
        {
          messageHistory: (input) => messageHistory,
          context: (input) => context,
          characterFile: (input) => JSON.stringify(characterFile, null, 2),
          characterJsonSchema: (input) => characterJsonSchema,
          formatInstructions: (input) => parser.getFormatInstructions(),
        },
        elizaCharacterGeneratorSystemPrompt,
        this.llm.getModel(),
        new StringOutputParser(),
        {
          characterJsonSchema: () => characterJsonSchema,
          jsonObject: (output) => JSON.stringify(output, null, 2)
        },
        jsonValidatorPrompt,
        this.llm.getModel(),
        fixingParser
      ]);
      
      console.log(`[CHARACTER] Character chain created with validation, starting stream`);
      const stream = await characterChain.stream(userMessage);
      
      // Add debug logging
      return this.addStreamLogging(stream, '[CHARACTER_STREAM]');
    } catch (error) {
      console.error(`[CHARACTER] Error setting up character file generation:`, error);
      throw error;
    }
  }
  
  /**
   * Add logging to a stream without consuming it
   * @param stream The stream to add logging to
   * @param prefix The prefix to use for log messages
   * @returns The same stream with logging added
   */
  private addStreamLogging<T>(stream: IterableReadableStream<T>, prefix: string): IterableReadableStream<T> {
    const controller = new TransformStream<T, T>();
    const writer = controller.writable.getWriter();
    
    // Process the original stream, log chunks, and forward them
    (async () => {
      try {
        let chunkCount = 0;
        for await (const chunk of stream) {
          chunkCount++;
          console.log(`${prefix} Chunk #${chunkCount}:`, JSON.stringify(chunk));
          await writer.write(chunk);
        }
        console.log(`${prefix} Stream completed with ${chunkCount} chunks`);
      } catch (error) {
        console.error(`${prefix} Error processing stream:`, error);
      } finally {
        writer.close();
      }
    })();
    
    return controller.readable as unknown as IterableReadableStream<T>;
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