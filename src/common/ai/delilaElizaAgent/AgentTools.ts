import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatOpenAI } from "@langchain/openai";
import { characterJsonSchema, CharacterSchema, ModelProviderName, TranscriptionProvider } from "./characterConfig";
import { ChatAnthropic } from "@langchain/anthropic";

/**
 * Define your tools here
 * Just add a new function to this object and it will be automatically available as a tool
 */
export const agentFunctions = {
  /**
   * Generate a character file using the Zod schema
   * This ensures the LLM generates correct JSON that matches the character schema
   */
  validateCharacterSchema: async (
    name: string,
    bio: string[],
    lore: string[],
    topics: string[],
    adjectives: string[],
    style: { all: string[], chat: string[], post: string[] },
    modelProvider: string,
    id?: string,
    username?: string,
    email?: string,
    system?: string,
    imageModelProvider?: ModelProviderName,
    imageVisionModelProvider?: ModelProviderName,
    modelEndpointOverride?: string,
    templates?: {
      goalsTemplate?: string,
      factsTemplate?: string,
      messageHandlerTemplate?: string,
      shouldRespondTemplate?: string,
      continueMessageHandlerTemplate?: string,
      evaluationTemplate?: string,
      twitterSearchTemplate?: string,
      twitterActionTemplate?: string,
      twitterPostTemplate?: string,
      twitterMessageHandlerTemplate?: string,
      twitterShouldRespondTemplate?: string,
      twitterVoiceHandlerTemplate?: string,
      instagramPostTemplate?: string,
      instagramMessageHandlerTemplate?: string,
      instagramShouldRespondTemplate?: string,
      farcasterPostTemplate?: string,
      lensPostTemplate?: string,
      farcasterMessageHandlerTemplate?: string,
      lensMessageHandlerTemplate?: string,
      farcasterShouldRespondTemplate?: string,
      lensShouldRespondTemplate?: string,
      telegramMessageHandlerTemplate?: string,
      telegramShouldRespondTemplate?: string,
      telegramAutoPostTemplate?: string,
      telegramPinnedMessageTemplate?: string,
      discordAutoPostTemplate?: string,
      discordAnnouncementHypeTemplate?: string,
      discordVoiceHandlerTemplate?: string,
      discordShouldRespondTemplate?: string,
      discordMessageHandlerTemplate?: string,
      slackMessageHandlerTemplate?: string,
      slackShouldRespondTemplate?: string,
      jeeterPostTemplate?: string,
      jeeterSearchTemplate?: string,
      jeeterInteractionTemplate?: string,
      jeeterMessageHandlerTemplate?: string,
      jeeterShouldRespondTemplate?: string,
      devaPostTemplate?: string,
    },
    messageExamples?: any[][],
    postExamples?: string[],
    knowledge?: (string | { path: string; shared?: boolean } | { directory: string; shared?: boolean })[],
    plugins?: any[],
    postProcessors?: string[],
    settings?: {
      secrets?: { [key: string]: string },
      intiface?: boolean,
      imageSettings?: {
        steps?: number,
        width?: number,
        height?: number,
        cfgScale?: number,
        negativePrompt?: string,
        numIterations?: number,
        guidanceScale?: number,
        seed?: number,
        modelId?: string,
        jobId?: string,
        count?: number,
        stylePreset?: string,
        hideWatermark?: boolean,
        safeMode?: boolean,
      },
      voice?: {
        model?: string,
        url?: string,
        elevenlabs?: {
          voiceId: string,
          model?: string,
          stability?: string,
          similarityBoost?: string,
          style?: string,
          useSpeakerBoost?: string,
        },
      },
      model?: string,
      modelConfig?: {
        temperature?: number,
        maxOutputTokens?: number,
        frequency_penalty?: number,
        presence_penalty?: number,
        maxInputTokens?: number,
        experimental_telemetry?: {
          isEnabled?: boolean,
          recordInputs?: boolean,
          recordOutputs?: boolean,
          functionId?: string,
        },
      },
      embeddingModel?: string,
      chains?: {
        evm?: any[],
        solana?: any[],
        [key: string]: any[] | undefined,
      },
      transcription?: TranscriptionProvider,
      ragKnowledge?: boolean,
    },
    clientConfig?: {
      discord?: {
        shouldIgnoreBotMessages?: boolean,
        shouldIgnoreDirectMessages?: boolean,
        shouldRespondOnlyToMentions?: boolean,
        messageSimilarityThreshold?: number,
        isPartOfTeam?: boolean,
        teamAgentIds?: string[],
        teamLeaderId?: string,
        teamMemberInterestKeywords?: string[],
        allowedChannelIds?: string[],
        autoPost?: {
          enabled?: boolean,
          monitorTime?: number,
          inactivityThreshold?: number,
          mainChannelId?: string,
          announcementChannelIds?: string[],
          minTimeBetweenPosts?: number,
        },
      },
      telegram?: {
        shouldIgnoreBotMessages?: boolean,
        shouldIgnoreDirectMessages?: boolean,
        shouldRespondOnlyToMentions?: boolean,
        shouldOnlyJoinInAllowedGroups?: boolean,
        allowedGroupIds?: string[],
        messageSimilarityThreshold?: number,
        isPartOfTeam?: boolean,
        teamAgentIds?: string[],
        teamLeaderId?: string,
        teamMemberInterestKeywords?: string[],
        autoPost?: {
          enabled?: boolean,
          monitorTime?: number,
          inactivityThreshold?: number,
          mainChannelId?: string,
          pinnedMessagesGroups?: string[],
          minTimeBetweenPosts?: number,
        },
      },
      slack?: {
        shouldIgnoreBotMessages?: boolean,
        shouldIgnoreDirectMessages?: boolean,
      },
      gitbook?: {
        keywords?: {
          projectTerms?: string[],
          generalQueries?: string[],
        },
        documentTriggers?: string[],
      },
    },
    twitterProfile?: {
      id: string,
      username: string,
      screenName: string,
      bio: string,
      nicknames?: string[],
    },
    instagramProfile?: {
      id: string,
      username: string,
      bio: string,
      nicknames?: string[],
    },
    simsaiProfile?: {
      id: string,
      username: string,
      screenName: string,
      bio: string,
    },
    nft?: {
      prompt: string,
    },
    extendsParam?: string[],
    twitterSpaces?: {
      maxSpeakers?: number,
      topics?: string[],
      typicalDurationMinutes?: number,
      idleKickTimeoutMs?: number,
      minIntervalBetweenSpacesMinutes?: number,
      businessHoursOnly?: boolean,
      randomChance?: number,
      enableIdleMonitor?: boolean,
      enableSttTts?: boolean,
      enableRecording?: boolean,
      voiceId?: string,
      sttLanguage?: string,
      speakerMaxDurationMs?: number,
    }
  ): Promise<string> => {
    console.log(`[TOOL] Generating character file for ${name}`);
    
    try {
      // Create a character object using the schema structure
      const characterData = {
        id,
        name,
        username,
        email,
        system,
        modelProvider,
        imageModelProvider,
        imageVisionModelProvider,
        modelEndpointOverride,
        templates,
        bio,
        lore,
        messageExamples: messageExamples || [],
        postExamples: postExamples || [],
        topics,
        adjectives,
        knowledge,
        plugins: plugins || [],
        postProcessors,
        settings,
        clientConfig,
        style,
        twitterProfile,
        instagramProfile,
        simsaiProfile,
        nft,
        extends: extendsParam,
        twitterSpaces
      };
      
      // Validate against the schema
      try {
        // Use the Zod schema to validate
        const validatedData = CharacterSchema.parse(characterData);
        console.log(`[TOOL] Character file validation successful`);
        return JSON.stringify(validatedData, null, 2);
      } catch (validationError) {
        console.error(`[TOOL] Character file validation error:`, validationError);
        
        // Return detailed validation errors
        if (validationError instanceof z.ZodError) {
          const errorDetails = validationError.errors.map(err => {
            return `- Path: ${err.path.join('.')}, Error: ${err.message}`;
          }).join('\n');
          
          return `Character file validation failed with the following errors:\n${errorDetails}\n\nPlease fix these issues and ensure the data conforms to the character schema.`;
        }
        
        return `Validation error: ${validationError instanceof Error ? validationError.message : String(validationError)}`;
      }
    } catch (error) {
      console.error(`[TOOL] Character file validation error:`, error);
      return `Error validating character file: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
  

};

/**
 * Convert the agent functions to LangChain tools
 * This is done automatically - you don't need to modify this
 */
export const agentTools = [
  // Character file generation tool
  tool(
    async ({ 
      name, 
      bio, 
      lore, 
      topics, 
      adjectives, 
      style, 
      modelProvider,
      id,
      username,
      email,
      system,
      imageModelProvider,
      imageVisionModelProvider,
      modelEndpointOverride,
      templates,
      messageExamples,
      postExamples,
      knowledge,
      plugins,
      postProcessors,
      settings,
      clientConfig,
      twitterProfile,
      instagramProfile,
      simsaiProfile,
      nft,
      extends: extendsParam,
      twitterSpaces
    }) => {
      return await agentFunctions.validateCharacterSchema(
        name,
        Array.isArray(bio) ? bio : [bio],
        lore,
        topics,
        adjectives,
        style,
        modelProvider,
        id,
        username,
        email,
        system,
        imageModelProvider,
        imageVisionModelProvider,
        modelEndpointOverride,
        templates,
        messageExamples,
        postExamples,
        knowledge,
        plugins,
        postProcessors,
        settings,
        clientConfig,
        twitterProfile,
        instagramProfile,
        simsaiProfile,
        nft,
        extendsParam,
        twitterSpaces
      );
    },
    {
      name: "validate_character_file",
      description: "Validate a character file using the schema structure",
      schema: CharacterSchema,
    }
  ),
  
];

/**
 * Function to bind tools to a chat model
 * @param model The chat model to bind tools to
 * @returns The model with tools bound to it
 */
export function bindToolsToModel(model: BaseChatModel): BaseChatModel {
  // For OpenAI models, we can use the bind method
  if ( model instanceof ChatAnthropic || model instanceof ChatOpenAI ) {
    // return model.bind({ tools: agentTools }) as unknown as BaseChatModel;
  }
  
  // For other models, we might need a different approach
  console.warn('[TOOLS] Model does not support binding tools. Tools will not be available.');
  return model;
} 