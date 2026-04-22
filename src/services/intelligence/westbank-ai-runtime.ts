import { getProviderCredentials, type LlmProviderName } from '../../../server/_shared/llm.ts';
import { isProviderAvailable } from '../../../server/_shared/llm-health.ts';
import { classifyEvent } from '../../../server/worldmonitor/intelligence/v1/classify-event.ts';
import { summarizeArticle } from '../../../server/worldmonitor/news/v1/summarize-article.ts';
import type {
  ClassifyEventRequest,
  ClassifyEventResponse,
  ServerContext as IntelligenceServerContext,
} from '../../generated/server/worldmonitor/intelligence/v1/service_server.ts';
import type {
  ServerContext as NewsServerContext,
  SummarizeArticleRequest,
  SummarizeArticleResponse,
} from '../../generated/server/worldmonitor/news/v1/service_server.ts';

export type WestBankAiProviderName = LlmProviderName;

export async function resolveAvailableWestBankAiProvider(
  providers: WestBankAiProviderName[],
): Promise<WestBankAiProviderName | null> {
  for (const provider of providers) {
    const credentials = getProviderCredentials(provider);
    if (!credentials) continue;
    if (await isProviderAvailable(credentials.apiUrl)) return provider;
  }

  return null;
}

export async function classifyWestBankEventWithAi(
  ctx: IntelligenceServerContext,
  req: ClassifyEventRequest,
): Promise<ClassifyEventResponse> {
  return classifyEvent(ctx, req);
}

export async function summarizeWestBankHeadlinesWithAi(
  ctx: NewsServerContext,
  req: SummarizeArticleRequest,
): Promise<SummarizeArticleResponse> {
  return summarizeArticle(ctx, req);
}
