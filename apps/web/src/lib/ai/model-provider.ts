import type { LanguageModel } from "ai";
import { openai } from "@ai-sdk/openai";

export type LiveAiProvider = "openai" | "gateway";

export type LiveAiModelConfig = {
  model: LanguageModel;
  modelId: string;
  provider: LiveAiProvider;
  usesGateway: boolean;
};

const defaultOpenAiModel = "gpt-5-mini";
const defaultGatewayModel = "amazon/nova-micro";

export function externalAiCallsEnabled() {
  return process.env.AI_EXTERNAL_CALLS_ENABLED === "true";
}

export function selectedLiveAiProvider(): LiveAiProvider {
  const provider = process.env.AI_MODEL_PROVIDER?.trim().toLowerCase();
  return provider === "gateway" ? "gateway" : "openai";
}

export function aiGatewayConfigured() {
  return Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN);
}

export function openAiConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function missingLiveAiConfigurationMessage(provider: LiveAiProvider) {
  if (!externalAiCallsEnabled()) {
    return "External AI calls are disabled. Set AI_EXTERNAL_CALLS_ENABLED=true only when intentionally testing a live provider.";
  }

  if (provider === "openai" && !openAiConfigured()) {
    return "Set OPENAI_API_KEY before running a live OpenAI portfolio brief.";
  }

  if (provider === "gateway" && !aiGatewayConfigured()) {
    return "Set VERCEL_OIDC_TOKEN, VERCEL_AI_GATEWAY_API_KEY, or AI_GATEWAY_API_KEY before running a live AI Gateway portfolio brief.";
  }

  return null;
}

export function resolveLivePortfolioBriefModel(): LiveAiModelConfig {
  const provider = selectedLiveAiProvider();

  if (provider === "openai") {
    const modelId = process.env.OPENAI_MODEL ?? process.env.OPENAI_MODEL_ID ?? defaultOpenAiModel;

    return {
      model: openai(modelId),
      modelId,
      provider,
      usesGateway: false,
    };
  }

  if (!process.env.VERCEL_AI_GATEWAY_API_KEY && process.env.AI_GATEWAY_API_KEY) {
    process.env.VERCEL_AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY;
  }
  if (!process.env.AI_GATEWAY_API_KEY && process.env.VERCEL_AI_GATEWAY_API_KEY) {
    process.env.AI_GATEWAY_API_KEY = process.env.VERCEL_AI_GATEWAY_API_KEY;
  }

  const modelId = process.env.AI_GATEWAY_MODEL ?? defaultGatewayModel;

  return {
    model: modelId,
    modelId,
    provider,
    usesGateway: true,
  };
}

export function resolveLiveStructuredResearchModel(): LiveAiModelConfig {
  return resolveLivePortfolioBriefModel();
}
