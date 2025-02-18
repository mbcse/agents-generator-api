import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

export type TemplateType = string ;

export type UUID = `${string}-${string}-${string}-${string}-${string}`;

export interface MessageExample {
    /** Associated user */
    user: UUID;

    /** Message content */
    content: Content;
}

export interface Content {
    /** The main text content */
    text: string;

    /** Optional action associated with the message */
    action?: string;

    /** Optional source/origin of the content */
    source?: string;

    /** URL of the original message/post (e.g. tweet URL, Discord message link) */
    url?: string;

    /** UUID of parent message if this is a reply/thread */
    inReplyTo?: UUID;

    /** Array of media attachments */
    attachments?: Media[];

    /** Additional dynamic properties */
    [key: string]: unknown;
}

export type Media = {
    /** Unique identifier */
    id: string;

    /** Media URL */
    url: string;

    /** Media title */
    title: string;

    /** Media source */
    source: string;

    /** Media description */
    description: string;

    /** Text content */
    text: string;

    /** Content type */
    contentType?: string;
};

export enum ModelProviderName {
    OPENAI = "openai",
    ETERNALAI = "eternalai",
    ANTHROPIC = "anthropic",
    GROK = "grok",
    GROQ = "groq",
    LLAMACLOUD = "llama_cloud",
    TOGETHER = "together",
    LLAMALOCAL = "llama_local",
    LMSTUDIO = "lmstudio",
    GOOGLE = "google",
    MISTRAL = "mistral",
    CLAUDE_VERTEX = "claude_vertex",
    REDPILL = "redpill",
    OPENROUTER = "openrouter",
    OLLAMA = "ollama",
    HEURIST = "heurist",
    GALADRIEL = "galadriel",
    FAL = "falai",
    GAIANET = "gaianet",
    ALI_BAILIAN = "ali_bailian",
    VOLENGINE = "volengine",
    NANOGPT = "nanogpt",
    HYPERBOLIC = "hyperbolic",
    VENICE = "venice",
    NVIDIA = "nvidia",
    NINETEEN_AI = "nineteen_ai",
    AKASH_CHAT_API = "akash_chat_api",
    LIVEPEER = "livepeer",
    LETZAI = "letzai",
    DEEPSEEK = "deepseek",
    INFERA = "infera",
    BEDROCK = "bedrock",
    ATOMA = "atoma",
    SECRETAI = "secret_ai",
    NEARAI = "nearai",
}

export interface ModelConfiguration {
    temperature?: number;
    maxOutputTokens?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
    maxInputTokens?: number;
    experimental_telemetry?: TelemetrySettings;
}

export type TelemetrySettings = {
    /**
     * Enable or disable telemetry. Disabled by default while experimental.
     */
    isEnabled?: boolean;
    /**
     * Enable or disable input recording. Enabled by default.
     *
     * You might want to disable input recording to avoid recording sensitive
     * information, to reduce data transfers, or to increase performance.
     */
    recordInputs?: boolean;
    /**
     * Enable or disable output recording. Enabled by default.
     *
     * You might want to disable output recording to avoid recording sensitive
     * information, to reduce data transfers, or to increase performance.
     */
    recordOutputs?: boolean;
    /**
     * Identifier for this function. Used to group telemetry data by function.
     */
    functionId?: string;
};


export enum TranscriptionProvider {
    OpenAI = "openai",
    Deepgram = "deepgram",
    Local = "local",
}


export type Character = {
    /** Optional unique identifier */
    id?: string;

    /** Character name */
    name: string;

    /** Optional username */
    username?: string;

    /** Optional email */
    email?: string;

    /** Optional system prompt */
    system?: string;

    /** Model provider to use */
    modelProvider: ModelProviderName;

    /** Image model provider to use, if different from modelProvider */
    imageModelProvider?: ModelProviderName;

    /** Image Vision model provider to use, if different from modelProvider */
    imageVisionModelProvider?: ModelProviderName;

    /** Optional model endpoint override */
    modelEndpointOverride?: string;

    /** Optional prompt templates */
    templates?: {
        goalsTemplate?: TemplateType;
        factsTemplate?: TemplateType;
        messageHandlerTemplate?: TemplateType;
        shouldRespondTemplate?: TemplateType;
        continueMessageHandlerTemplate?: TemplateType;
        evaluationTemplate?: TemplateType;
        twitterSearchTemplate?: TemplateType;
        twitterActionTemplate?: TemplateType;
        twitterPostTemplate?: TemplateType;
        twitterMessageHandlerTemplate?: TemplateType;
        twitterShouldRespondTemplate?: TemplateType;
        twitterVoiceHandlerTemplate?: TemplateType;
        instagramPostTemplate?: TemplateType;
        instagramMessageHandlerTemplate?: TemplateType;
        instagramShouldRespondTemplate?: TemplateType;
        farcasterPostTemplate?: TemplateType;
        lensPostTemplate?: TemplateType;
        farcasterMessageHandlerTemplate?: TemplateType;
        lensMessageHandlerTemplate?: TemplateType;
        farcasterShouldRespondTemplate?: TemplateType;
        lensShouldRespondTemplate?: TemplateType;
        telegramMessageHandlerTemplate?: TemplateType;
        telegramShouldRespondTemplate?: TemplateType;
        telegramAutoPostTemplate?: string;
        telegramPinnedMessageTemplate?: string;
        discordAutoPostTemplate?: string;
        discordAnnouncementHypeTemplate?: string;
        discordVoiceHandlerTemplate?: TemplateType;
        discordShouldRespondTemplate?: TemplateType;
        discordMessageHandlerTemplate?: TemplateType;
        slackMessageHandlerTemplate?: TemplateType;
        slackShouldRespondTemplate?: TemplateType;
        jeeterPostTemplate?: string;
        jeeterSearchTemplate?: string;
        jeeterInteractionTemplate?: string;
        jeeterMessageHandlerTemplate?: string;
        jeeterShouldRespondTemplate?: string;
        devaPostTemplate?: string;
    };

    /** Character biography */
    bio: string | string[];

    /** Character background lore */
    lore: string[];

    /** Example messages */
    messageExamples: MessageExample[][];

    /** Example posts */
    postExamples: string[];

    /** Known topics */
    topics: string[];

    /** Character traits */
    adjectives: string[];

    /** Optional knowledge base */
    knowledge?: (string | { path: string; shared?: boolean } | { directory: string; shared?: boolean })[];

    /** Available plugins */
    plugins: Plugin[];

    /** Character Processor Plugins */
    postProcessors?: string[];

    /** Optional configuration */
    settings?: {
        secrets?: { [key: string]: string };
        intiface?: boolean;
        imageSettings?: {
            steps?: number;
            width?: number;
            height?: number;
            cfgScale?: number;
            negativePrompt?: string;
            numIterations?: number;
            guidanceScale?: number;
            seed?: number;
            modelId?: string;
            jobId?: string;
            count?: number;
            stylePreset?: string;
            hideWatermark?: boolean;
            safeMode?: boolean;
        };
        voice?: {
            model?: string; // For VITS
            url?: string; // Legacy VITS support
            elevenlabs?: {
                // New structured ElevenLabs config
                voiceId: string;
                model?: string;
                stability?: string;
                similarityBoost?: string;
                style?: string;
                useSpeakerBoost?: string;
            };
        };
        model?: string;
        modelConfig?: ModelConfiguration;
        embeddingModel?: string;
        chains?: {
            evm?: any[];
            solana?: any[];
            [key: string]: any[];
        };
        transcription?: TranscriptionProvider;
        ragKnowledge?: boolean;
    };

    /** Optional client-specific config */
    clientConfig?: {
        discord?: {
            shouldIgnoreBotMessages?: boolean;
            shouldIgnoreDirectMessages?: boolean;
            shouldRespondOnlyToMentions?: boolean;
            messageSimilarityThreshold?: number;
            isPartOfTeam?: boolean;
            teamAgentIds?: string[];
            teamLeaderId?: string;
            teamMemberInterestKeywords?: string[];
            allowedChannelIds?: string[];
            autoPost?: {
                enabled?: boolean;
                monitorTime?: number;
                inactivityThreshold?: number;
                mainChannelId?: string;
                announcementChannelIds?: string[];
                minTimeBetweenPosts?: number;
            };
        };
        telegram?: {
            shouldIgnoreBotMessages?: boolean;
            shouldIgnoreDirectMessages?: boolean;
            shouldRespondOnlyToMentions?: boolean;
            shouldOnlyJoinInAllowedGroups?: boolean;
            allowedGroupIds?: string[];
            messageSimilarityThreshold?: number;
            isPartOfTeam?: boolean;
            teamAgentIds?: string[];
            teamLeaderId?: string;
            teamMemberInterestKeywords?: string[];
            autoPost?: {
                enabled?: boolean;
                monitorTime?: number;
                inactivityThreshold?: number;
                mainChannelId?: string;
                pinnedMessagesGroups?: string[];
                minTimeBetweenPosts?: number;
            };
        };
        slack?: {
            shouldIgnoreBotMessages?: boolean;
            shouldIgnoreDirectMessages?: boolean;
        };
        gitbook?: {
            keywords?: {
                projectTerms?: string[];
                generalQueries?: string[];
            };
            documentTriggers?: string[];
        };
    };

    /** Writing style guides */
    style: {
        all: string[];
        chat: string[];
        post: string[];
    };

    /** Optional Twitter profile */
    twitterProfile?: {
        id: string;
        username: string;
        screenName: string;
        bio: string;
        nicknames?: string[];
    };

    /** Optional Instagram profile */
    instagramProfile?: {
        id: string;
        username: string;
        bio: string;
        nicknames?: string[];
    };

    /** Optional SimsAI profile */
    simsaiProfile?: {
        id: string;
        username: string;
        screenName: string;
        bio: string;
    };

    /** Optional NFT prompt */
    nft?: {
        prompt: string;
    };

    /**Optinal Parent characters to inherit information from */
    extends?: string[];

    twitterSpaces?: TwitterSpaceDecisionOptions;
};

export interface TwitterSpaceDecisionOptions {
    maxSpeakers?: number;
    topics?: string[];
    typicalDurationMinutes?: number;
    idleKickTimeoutMs?: number;
    minIntervalBetweenSpacesMinutes?: number;
    businessHoursOnly?: boolean;
    randomChance?: number;
    enableIdleMonitor?: boolean;
    enableSttTts?: boolean;
    enableRecording?: boolean;
    voiceId?: string;
    sttLanguage?: string;
    speakerMaxDurationMs?: number;
}

export const CharacterSchema = z.object({
    id: z.string().uuid().optional(),
    name: z.string(),
    username: z.string().optional(),
    email: z.string().optional(),
    system: z.string().optional(),
    modelProvider: z.nativeEnum(ModelProviderName),
    imageModelProvider: z.nativeEnum(ModelProviderName).optional(),
    imageVisionModelProvider: z.nativeEnum(ModelProviderName).optional(),
    modelEndpointOverride: z.string().optional(),
    templates: z.object({
        goalsTemplate: z.string().optional(),
        factsTemplate: z.string().optional(),
        messageHandlerTemplate: z.string().optional(),
        shouldRespondTemplate: z.string().optional(),
        continueMessageHandlerTemplate: z.string().optional(),
        evaluationTemplate: z.string().optional(),
        twitterSearchTemplate: z.string().optional(),
        twitterActionTemplate: z.string().optional(),
        twitterPostTemplate: z.string().optional(),
        twitterMessageHandlerTemplate: z.string().optional(),
        twitterShouldRespondTemplate: z.string().optional(),
        twitterVoiceHandlerTemplate: z.string().optional(),
        instagramPostTemplate: z.string().optional(),
        instagramMessageHandlerTemplate: z.string().optional(),
        instagramShouldRespondTemplate: z.string().optional(),
        farcasterPostTemplate: z.string().optional(),
        lensPostTemplate: z.string().optional(),
        farcasterMessageHandlerTemplate: z.string().optional(),
        lensMessageHandlerTemplate: z.string().optional(),
        farcasterShouldRespondTemplate: z.string().optional(),
        lensShouldRespondTemplate: z.string().optional(),
        telegramMessageHandlerTemplate: z.string().optional(),
        telegramShouldRespondTemplate: z.string().optional(),
        telegramAutoPostTemplate: z.string().optional(),
        telegramPinnedMessageTemplate: z.string().optional(),
        discordAutoPostTemplate: z.string().optional(),
        discordAnnouncementHypeTemplate: z.string().optional(),
        discordVoiceHandlerTemplate: z.string().optional(),
        discordShouldRespondTemplate: z.string().optional(),
        discordMessageHandlerTemplate: z.string().optional(),
        slackMessageHandlerTemplate: z.string().optional(),
        slackShouldRespondTemplate: z.string().optional(),
        jeeterPostTemplate: z.string().optional(),
        jeeterSearchTemplate: z.string().optional(),
        jeeterInteractionTemplate: z.string().optional(),
        jeeterMessageHandlerTemplate: z.string().optional(),
        jeeterShouldRespondTemplate: z.string().optional(),
        devaPostTemplate: z.string().optional(),
    }).optional(),
    bio: z.union([z.string(), z.array(z.string())]),
    lore: z.array(z.string()),
    messageExamples: z.array(z.array(z.object({
        user: z.string(),
        content: z.object({
            text: z.string(),
            action: z.string().optional(),
            source: z.string().optional(),
            url: z.string().optional(),
            inReplyTo: z.string().optional(),
            attachments: z.array(z.object({
                id: z.string(),
                url: z.string(),
                title: z.string(),
                source: z.string(),
                description: z.string(),
                text: z.string(),
                contentType: z.string().optional(),
            })).optional(),
        }).catchall(z.unknown()),
    }))),
    postExamples: z.array(z.string()),
    topics: z.array(z.string()),
    adjectives: z.array(z.string()),
    knowledge: z.array(
        z.union([
            z.string(),
            z.object({
                path: z.string(),
                shared: z.boolean().optional()
            }),
            z.object({
                directory: z.string(),
                shared: z.boolean().optional()
            })
        ])
    ).optional(),
    plugins: z.array(z.any()), // Using z.any() for Plugin type since it's not fully defined in the snippet
    postProcessors: z.array(z.string()).optional(),
    settings: z.object({
        secrets: z.record(z.string()).optional(),
        intiface: z.boolean().optional(),
        imageSettings: z.object({
            steps: z.number().optional(),
            width: z.number().optional(),
            height: z.number().optional(),
            cfgScale: z.number().optional(),
            negativePrompt: z.string().optional(),
            numIterations: z.number().optional(),
            guidanceScale: z.number().optional(),
            seed: z.number().optional(),
            modelId: z.string().optional(),
            jobId: z.string().optional(),
            count: z.number().optional(),
            stylePreset: z.string().optional(),
            hideWatermark: z.boolean().optional(),
            safeMode: z.boolean().optional(),
        }).optional(),
        voice: z.object({
            model: z.string().optional(),
            url: z.string().optional(),
            elevenlabs: z.object({
                voiceId: z.string(),
                model: z.string().optional(),
                stability: z.string().optional(),
                similarityBoost: z.string().optional(),
                style: z.string().optional(),
                useSpeakerBoost: z.string().optional(),
            }).optional(),
        }).optional(),
        model: z.string().optional(),
        modelConfig: z.object({
            temperature: z.number().optional(),
            maxOutputTokens: z.number().optional(),
            frequency_penalty: z.number().optional(),
            presence_penalty: z.number().optional(),
            maxInputTokens: z.number().optional(),
            experimental_telemetry: z.object({
                isEnabled: z.boolean().optional(),
                recordInputs: z.boolean().optional(),
                recordOutputs: z.boolean().optional(),
                functionId: z.string().optional(),
            }).optional(),
        }).optional(),
        embeddingModel: z.string().optional(),
        chains: z.object({
            evm: z.array(z.any()).optional(),
            solana: z.array(z.any()).optional(),
        }).catchall(z.array(z.any())).optional(),
        transcription: z.nativeEnum(TranscriptionProvider).optional(),
        ragKnowledge: z.boolean().optional(),
    }).optional(),
    clientConfig: z.object({
        discord: z.object({
            shouldIgnoreBotMessages: z.boolean().optional(),
            shouldIgnoreDirectMessages: z.boolean().optional(),
            shouldRespondOnlyToMentions: z.boolean().optional(),
            messageSimilarityThreshold: z.number().optional(),
            isPartOfTeam: z.boolean().optional(),
            teamAgentIds: z.array(z.string()).optional(),
            teamLeaderId: z.string().optional(),
            teamMemberInterestKeywords: z.array(z.string()).optional(),
            allowedChannelIds: z.array(z.string()).optional(),
            autoPost: z.object({
                enabled: z.boolean().optional(),
                monitorTime: z.number().optional(),
                inactivityThreshold: z.number().optional(),
                mainChannelId: z.string().optional(),
                announcementChannelIds: z.array(z.string()).optional(),
                minTimeBetweenPosts: z.number().optional(),
            }).optional(),
        }).optional(),
        telegram: z.object({
            shouldIgnoreBotMessages: z.boolean().optional(),
            shouldIgnoreDirectMessages: z.boolean().optional(),
            shouldRespondOnlyToMentions: z.boolean().optional(),
            shouldOnlyJoinInAllowedGroups: z.boolean().optional(),
            allowedGroupIds: z.array(z.string()).optional(),
            messageSimilarityThreshold: z.number().optional(),
            isPartOfTeam: z.boolean().optional(),
            teamAgentIds: z.array(z.string()).optional(),
            teamLeaderId: z.string().optional(),
            teamMemberInterestKeywords: z.array(z.string()).optional(),
            autoPost: z.object({
                enabled: z.boolean().optional(),
                monitorTime: z.number().optional(),
                inactivityThreshold: z.number().optional(),
                mainChannelId: z.string().optional(),
                pinnedMessagesGroups: z.array(z.string()).optional(),
                minTimeBetweenPosts: z.number().optional(),
            }).optional(),
        }).optional(),
        slack: z.object({
            shouldIgnoreBotMessages: z.boolean().optional(),
            shouldIgnoreDirectMessages: z.boolean().optional(),
        }).optional(),
        gitbook: z.object({
            keywords: z.object({
                projectTerms: z.array(z.string()).optional(),
                generalQueries: z.array(z.string()).optional(),
            }).optional(),
            documentTriggers: z.array(z.string()).optional(),
        }).optional(),
    }).optional(),
    style: z.object({
        all: z.array(z.string()),
        chat: z.array(z.string()),
        post: z.array(z.string()),
    }),
    twitterProfile: z.object({
        id: z.string(),
        username: z.string(),
        screenName: z.string(),
        bio: z.string(),
        nicknames: z.array(z.string()).optional(),
    }).optional(),
    instagramProfile: z.object({
        id: z.string(),
        username: z.string(),
        bio: z.string(),
        nicknames: z.array(z.string()).optional(),
    }).optional(),
    simsaiProfile: z.object({
        id: z.string(),
        username: z.string(),
        screenName: z.string(),
        bio: z.string(),
    }).optional(),
    nft: z.object({
        prompt: z.string(),
    }).optional(),
    extends: z.array(z.string()).optional(),
    twitterSpaces: z.object({
        maxSpeakers: z.number().optional(),
        topics: z.array(z.string()).optional(),
        typicalDurationMinutes: z.number().optional(),
        idleKickTimeoutMs: z.number().optional(),
        minIntervalBetweenSpacesMinutes: z.number().optional(),
        businessHoursOnly: z.boolean().optional(),
        randomChance: z.number().optional(),
        enableIdleMonitor: z.boolean().optional(),
        enableSttTts: z.boolean().optional(),
        enableRecording: z.boolean().optional(),
        voiceId: z.string().optional(),
        sttLanguage: z.string().optional(),
        speakerMaxDurationMs: z.number().optional(),
    }).optional(),
}); 


export const characterJsonSchema = JSON.stringify(zodToJsonSchema(CharacterSchema), null, 2);
