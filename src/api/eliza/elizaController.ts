import type { Request, RequestHandler, Response } from "express";

import { elizaService } from "@/api/eliza/elizaService";
import { handleServiceResponse } from "@/common/utils/httpHandlers";
import { ElizaGeneratorAgent } from "@/common/ai/delilaElizaAgent/AgentServer";
import { LLLModelConfig, LLMProviders } from "@/common/ai/LLMModelManager";
import { EmbeddingConfig, EmbeddingProvider } from "@/common/ai/EmbeddingManager";
import { VectorStoreConfig, VectorStoreProvider } from "@/common/ai/VectorStoreManager";
import { LangChainAdapter } from 'ai';
import { DatabaseService } from "@/database";

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

// Define error interface for better type checking
interface LLMError {
  name?: string;
  message?: string;
  lc_error_code?: string;
  [key: string]: any;
}

class ElizaController {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  /**
   * Initialize a new session
   * @param req Request object
   * @param res Response object
   * @returns Session ID and optional welcome message
   */
  public initSession: RequestHandler = async (req: Request, res: Response) => {
    try {
      // Connect to the database
      await this.db.connect();
      
      // Create a new session
      const session = await this.db.sessions.createSession();
      
      // If an initial message was provided, store it
      if (req.body.initialMessage) {
        await this.db.messages.createMessage({
          content: req.body.initialMessage,
          role: 'user',
          sessionId: session.id,
        });
      }
      
      // Return the session ID
      return res.status(200).json({
        sessionId: session.id,
        message: "Session initialized successfully"
      });
    } catch (error) {
      console.error("Error initializing session:", error);
      return res.status(500).json({ 
        error: "Failed to initialize session",
        message: (error as Error).message || String(error)
      });
    }
  };

  public chat: RequestHandler = async (req: Request, res: Response) => {
    try {
      // Connect to the database
      await this.db.connect();
      
      // Validate that the session ID is provided
      if (!req.body.sessionId) {
        return res.status(400).json({ 
          error: "Session ID is required",
          message: "Please initialize a session first using the /init-session endpoint"
        });
      }
      
      // Check if the session exists
      const sessionExists = await this.db.sessions.getSessionById(req.body.sessionId);
      if (!sessionExists) {
        return res.status(404).json({ 
          error: "Session not found",
          message: "The provided session ID does not exist"
        });
      }
      
      const elizaAgentServer = await ElizaGeneratorAgent.create(modelConfig, embeddingConfig, vectorStoreConfig);
      console.log(req.body.messages);
      const message = req.body.messages[req.body.messages.length - 1].content;
      console.log(message);
      
      // Store the user's message in the database
      await this.db.messages.createMessage({
        content: message,
        role: 'user',
        sessionId: req.body.sessionId,
      });
      
      // Initialize the session and get message history and context
      const sessionId = req.body.sessionId;
      const { messageHistory, context, sessionId: actualSessionId, characterFile } = await elizaAgentServer.initializeSession(sessionId, message);
      
      // Set up SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      // First, stream the reply
      console.log("Starting to stream reply...");
      let fullReply = '';
      
      try {
        const replyStream = await elizaAgentServer.generateReply(actualSessionId, message, messageHistory, context, characterFile);
        
        console.log("Got reply stream, starting to iterate...");
        for await (const chunk of replyStream) {
          console.log('Reply chunk received:', JSON.stringify(chunk));
          
          // Accumulate the full reply for database storage
          if (chunk.reply) {
            fullReply += chunk.reply;
          }
          
          // Convert the chunk object to a string before writing to the response
          const replyContent = chunk.reply || chunk;
          const replyChunk = {
            type: 'reply',
            content: replyContent
          };
          const chunkString = JSON.stringify(replyChunk);
          // Format as SSE (Server-Sent Events)
          res.write(`data: ${chunkString}\n\n`);
        }
        
        // Store the complete reply in the database
        if (fullReply) {
          await this.db.messages.createMessage({
            content: fullReply,
            role: 'assistant',
            sessionId: actualSessionId,
          });
          console.log(`[CONTROLLER] Stored complete reply in database for session ${actualSessionId}`);
        }
      } catch (error) {
        const replyError = error as LLMError;
        console.error("Error generating reply:", replyError);
        const errorChunk = {
          type: 'error',
          content: 'Failed to generate reply. Please try again.',
          errorType: 'replyError'
        };
        res.write(`data: ${JSON.stringify(errorChunk)}\n\n`);
      }
      
      // Then, stream the character file
      console.log("Starting to stream character file...");
      let characterData: any = null;
      
      try {
        const characterFileStream = await elizaAgentServer.generateCharacterFile(actualSessionId, message, messageHistory, context, characterFile);
        
        console.log("Got character file stream, starting to iterate...");
        for await (const chunk of characterFileStream) {
          console.log('Character file chunk received:', JSON.stringify(chunk));
          
          // Store the complete character data
          if (chunk) {
            characterData = chunk;
          }
          
          // Convert the chunk object to a string before writing to the response
          const characterFileChunk = {
            type: 'characterFile',
            content: chunk
          };
          const chunkString = JSON.stringify(characterFileChunk);
          // Format as SSE (Server-Sent Events)
          res.write(`data: ${chunkString}\n\n`);
        }
        
        // Store the character file in the database
        if (characterData) {
          await this.db.characterFiles.createCharacterFile({
            content: characterData,
            sessionId: actualSessionId,
          });
          console.log(`[CONTROLLER] Stored character file in database for session ${actualSessionId}`);
        }
      } catch (error) {
        const characterFileError = error as LLMError;
        console.error("Error generating character file:", characterFileError);
        // Check if it's a parsing error
        const isParsingError = characterFileError.name === 'OutputParserException' || 
                              characterFileError.message?.includes('parsing') ||
                              characterFileError.lc_error_code === 'OUTPUT_PARSING_FAILURE';
        
        const errorChunk = {
          type: 'error',
          content: isParsingError 
            ? 'Failed to parse character file. The AI generated incomplete or invalid JSON.'
            : 'Failed to generate character file. Please try again.',
          errorType: 'characterFileError',
          error: characterFileError.message || String(characterFileError)
        };
        res.write(`data: ${JSON.stringify(errorChunk)}\n\n`);
      }
      
      // End the stream with a done event
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error) {
      const generalError = error as Error;
      console.error("Error in chat handler:", generalError);
      // Check if headers have already been sent
      if (!res.headersSent) {
        res.status(500).json({ error: "An error occurred while processing your request" });
      } else {
        // If headers are already sent, just end the response
        const errorChunk = {
          type: 'error',
          content: 'An error occurred while processing your request',
          error: generalError.message || String(generalError)
        };
        res.write(`data: ${JSON.stringify(errorChunk)}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      }
    }
  };
}

export const elizaController = new ElizaController();
