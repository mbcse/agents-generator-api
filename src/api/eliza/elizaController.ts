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

// Define error interface for better type checking
interface LLMError {
  name?: string;
  message?: string;
  lc_error_code?: string;
  [key: string]: any;
}

class ElizaController {
  public chat: RequestHandler = async (req: Request, res: Response) => {
    try {
      const elizaAgentServer = await ElizaGeneratorAgent.create(modelConfig, embeddingConfig, vectorStoreConfig);
      console.log(req.body.messages);
      const message = req.body.messages[req.body.messages.length - 1].content;
      console.log(message);
      
      // Initialize the session and get message history and context
      const sessionId = "1234"; // In a real app, this would be a unique session ID
      const { messageHistory, context } = await elizaAgentServer.initializeSession(sessionId, message);
      
      // Set up SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      // First, stream the reply
      console.log("Starting to stream reply...");
      try {
        const replyStream = await elizaAgentServer.generateReply(sessionId, message, messageHistory, context);
        
        for await (const chunk of replyStream) {
          console.log('Reply chunk:', chunk);
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
      try {
        const characterFileStream = await elizaAgentServer.generateCharacterFile(sessionId, message, messageHistory, context);
        
        for await (const chunk of characterFileStream) {
          console.log('Character file chunk:', chunk);
          // Convert the chunk object to a string before writing to the response
          const characterFileChunk = {
            type: 'characterFile',
            content: chunk
          };
          const chunkString = JSON.stringify(characterFileChunk);
          // Format as SSE (Server-Sent Events)
          res.write(`data: ${chunkString}\n\n`);
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
