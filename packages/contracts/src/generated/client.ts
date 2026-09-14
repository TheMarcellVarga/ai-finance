export type Asset = {
  ticker: string;
  name: string;
  exchange: string;
  type: string;
  assetClass?: string;
  sector?: string;
  cik?: string;
  countryCode?: string;
  country?: string;
  region?: string;
  currency?: string;
  mic?: string;
  isin?: string;
  cusip?: string;
  figi?: string;
  providerSymbol?: string;
  capturedAt?: string;
  freshness?: string;
  provider?: string;
  displayPrice?: string;
  dailyChangeBps?: number;
};

export type AssetSearchResponse = {
  data: Asset[];
  meta: {
    query?: string;
    assetClass?: string;
    countryCode?: string;
    region?: string;
    currency?: string;
    exchange?: string;
    coverage?: string;
    provider: string;
    freshness: string;
  };
};

export type AssetCatalogResponse = {
  data: {
    assetClasses: Array<{ id: string; label: string; description: string }>;
    regions: string[];
    countryCoverage: {
      standard: string;
      acceptedCodePattern: string;
      allCodesAccepted: boolean;
      scope: string;
    };
    currencyStandard: string;
  };
  meta: ContractMeta;
};

export type MarketMonitorPoint = { timestamp: string; value: number };

export type MarketMonitorRow = {
  symbol: string;
  name: string;
  venue?: string;
  currency?: string;
  unit?: string;
  price: number;
  displayValue: string;
  dailyChangePercent: number;
  monthlyChangePercent: number;
  volume?: number;
  sparkline: MarketMonitorPoint[];
  provider: string;
  sourceUrl: string;
  capturedAt: string;
  isProxy?: boolean;
  proxyNote?: string;
};

export type MarketMonitorResponse = {
  data: MarketMonitorRow[];
  meta: {
    assetClass: string;
    label: string;
    description: string;
    provider: string;
    providerLabel: string;
    freeApi: boolean;
    capturedAt: string;
    requestedMarkets: number;
    returnedMarkets: number;
    failedMarkets: number;
    coverage: string;
    quoteConvention: string;
    freshness: string;
    failureReasons: string[];
    availableClasses: Array<{ id: string; label: string; description: string; coverage: string }>;
  };
};

export type QuoteSnapshot = {
  ticker: string;
  priceCents: number;
  displayPrice: string;
  dailyChangeBps?: number;
  currency?: string;
  timestamp: string;
  provider: string;
  freshness: string;
};

export type QuoteResponse = {
  data: QuoteSnapshot;
  meta: ContractMeta;
};

export type IntradayPoint = {
  timestamp: string;
  closeCents: number;
  displayClose: string;
  volume?: number;
  provider: string;
};

export type IntradayResponse = {
  data: IntradayPoint[];
  meta: ContractMeta & {
    ticker?: string;
    interval?: string;
  };
};

export type HealthResponse = {
  status: "ok";
  service: string;
  timestamp: string;
};

export type PrincipalResponse = {
  data: {
    clerkUserId: string;
    email?: string;
    issuer: string;
  };
};

export type UsageResponse = {
  data: {
    clerkUserId: string;
    period: string;
    plan: string;
    features: Array<{
      feature: string;
      used: number;
      limit: number;
      status: string;
    }>;
  };
};

export type ContractMeta = {
  provider: string;
  freshness: string;
  capturedAt: string;
};

export type DataFreshness = ContractMeta;

export type Allocation = {
  label: string;
  weightBps: number;
  status: "ok" | "review";
};

export type Holding = {
  id: string;
  asset: Asset;
  quantity: number;
  displayQuantity: string;
  displayAvgCost: string;
  marketValueCents: number;
  displayValue: string;
  weightBps: number;
  notes?: string;
};

export type PortfolioSummary = {
  totalValueCents: number;
  displayTotalValue: string;
  topConcentrationTicker: string;
  topConcentrationBps: number;
  holdingCount: number;
  reviewFlags: number;
};

export type Transaction = {
  id: string;
  assetTicker?: string;
  type: "buy" | "sell" | "deposit" | "withdrawal" | "dividend";
  transactionDate: string;
  quantity?: number;
  displayQuantity?: string;
  displayAmount: string;
  notes?: string;
};

export type Portfolio = {
  id: string;
  name: string;
  baseCurrency: string;
  visibility: string;
  holdings: Holding[];
  transactions: Transaction[];
  summary: PortfolioSummary;
  allocation: Allocation[];
  dataFreshness: DataFreshness;
};

export type PortfolioListResponse = {
  data: Portfolio[];
  meta: ContractMeta;
};

export type PortfolioResponse = {
  data: Portfolio;
  meta: ContractMeta;
};

export type CreatePortfolioRequest = {
  name?: string;
  baseCurrency?: string;
  initialHoldings?: Array<{
    ticker: string;
    quantity?: number;
    averageCostCents?: number;
    notes?: string;
  }>;
};

export type UpdatePortfolioRequest = {
  name?: string;
  baseCurrency?: string;
};

export type AddHoldingRequest = {
  ticker: string;
  quantity?: number;
  averageCostCents?: number;
  notes?: string;
};

export type WatchlistItem = {
  id: string;
  asset: Asset;
  notes?: string;
};

export type Watchlist = {
  id: string;
  name: string;
  items: WatchlistItem[];
  dataFreshness: DataFreshness;
};

export type WatchlistListResponse = {
  data: Watchlist[];
  meta: ContractMeta;
};

export type WatchlistResponse = {
  data: Watchlist;
  meta: ContractMeta;
};

export type CreateWatchlistRequest = {
  name?: string;
  initialAssets?: string[];
};

export type AddWatchlistItemRequest = {
  ticker: string;
  notes?: string;
};

export type ResearchMeta = {
  persistence: "memory" | "postgres";
  storage?: "memory" | "local-private" | "supabase-private";
};

export type ResearchWorkspace = {
  id: string;
  name: string;
  description: string;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
};

export type ResearchDocument = {
  id: string;
  workspaceId: string;
  title: string;
  originalFilename: string;
  mimeType: "application/pdf" | "text/plain";
  byteSize: number;
  sha256: string;
  status: "uploading" | "queued" | "processing" | "ready" | "failed";
  attemptCount: number;
  errorCode?: string;
  errorMessage?: string;
  pageCount: number;
  uploadedAt?: string;
  parsedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type ResearchPage = {
  id: string;
  documentId: string;
  workspaceId: string;
  pageNumber: number;
  normalizedText: string;
  textSha256: string;
  characterCount: number;
  sourceMetadata: Record<string, unknown>;
};

export type ResearchWorkspaceListResponse = { data: ResearchWorkspace[]; meta: ResearchMeta };
export type ResearchWorkspaceResponse = { data: ResearchWorkspace; meta: ResearchMeta };
export type ResearchDocumentListResponse = { data: ResearchDocument[]; meta: ResearchMeta };
export type ResearchDocumentResponse = { data: ResearchDocument; meta: ResearchMeta };
export type ResearchPageListResponse = { data: ResearchPage[]; meta: ResearchMeta };

export type ResearchSearchRequest = {
  query: string;
  limit?: number;
  documentIds?: string[];
};

export type EvidenceResult = {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  pageNumber: number;
  sequence: number;
  snippet: string;
  sourceLocator: string;
  sectionLabel?: string;
  headingPath: string[];
  chunkerVersion: string;
  embeddingProvider: string;
  embeddingModel: string;
  embeddingVersion: string;
  vectorSimilarity: number;
  lexicalScore: number;
  combinedScore: number;
};

export type EmbeddingDescriptor = {
  provider: string;
  model: string;
  version: string;
  dimensions: number;
  externalCalls: boolean;
};

export type RetrievalDiagnostics = {
  runId: string;
  querySha256: string;
  filters: { workspaceId: string; documentIds: string[] };
  chunkerVersion: string;
  embedding: EmbeddingDescriptor;
  requestedLimit: number;
  candidateCount: number;
  resultCount: number;
  duplicatesSuppressed: number;
  stageTimingsMs: Record<string, number>;
};

export type ResearchSearchResponse = {
  data: { results: EvidenceResult[]; diagnostics: RetrievalDiagnostics };
  meta: ResearchMeta;
};

export type ResearchAnalysisSectionKey =
  | "executive_summary"
  | "operating_signals"
  | "risk_factors"
  | "questions_for_review";

export type ResearchAnalysisReviewEventType =
  | "edit_saved"
  | "accepted"
  | "rejected"
  | "citation_flagged";

export type ResearchAnalysisReviewEvent = {
  id: string;
  requestId: string;
  analysisRunId: string;
  sectionKey: ResearchAnalysisSectionKey;
  eventType: ResearchAnalysisReviewEventType;
  contentEventId?: string;
  sectionTitle?: string;
  sectionBody?: string;
  note?: string;
  citationChunkId?: string;
  outputSha256: string;
  createdAt: string;
};

export type AppendResearchAnalysisReviewEventRequest = {
  requestId: string;
  sectionKey: ResearchAnalysisSectionKey;
  eventType: ResearchAnalysisReviewEventType;
  contentEventId?: string;
  sectionTitle?: string;
  sectionBody?: string;
  note?: string;
  citationChunkId?: string;
};

export type ResearchAnalysisReviewEventListResponse = {
  data: ResearchAnalysisReviewEvent[];
  meta: ResearchMeta;
};

export type ResearchAnalysisReviewEventResponse = {
  data: ResearchAnalysisReviewEvent;
  meta: ResearchMeta & { replayed?: boolean };
};

export type FinanceApiClientOptions = {
  baseUrl: string;
  getToken?: () => Promise<string | undefined> | string | undefined;
  fetch?: typeof fetch;
};

export class FinanceApiClient {
  private readonly baseUrl: string;
  private readonly getToken?: FinanceApiClientOptions["getToken"];
  private readonly fetcher: typeof fetch;

  constructor(options: FinanceApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.getToken = options.getToken;
    this.fetcher = options.fetch ?? fetch;
  }

  async health(): Promise<HealthResponse> {
    return this.request<HealthResponse>("/v1/health");
  }

  async searchAssets(query: string, filters: {
    assetClass?: string;
    countryCode?: string;
    region?: string;
    currency?: string;
    exchange?: string;
    limit?: number;
  } = {}): Promise<AssetSearchResponse> {
    const params = new URLSearchParams();
    if (query) {
      params.set("q", query);
    }
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== "") {
        params.set(key, String(value));
      }
    }
    return this.request<AssetSearchResponse>(`/v1/assets/search?${params}`);
  }

  async getAssetCatalog(): Promise<AssetCatalogResponse> {
    return this.request<AssetCatalogResponse>("/v1/assets/catalog");
  }

  async getMarketMonitor(assetClass: string): Promise<MarketMonitorResponse> {
    return this.request<MarketMonitorResponse>(`/v1/market-monitors/${encodeURIComponent(assetClass)}`);
  }

  async getAssetQuote(ticker: string): Promise<QuoteResponse> {
    return this.request<QuoteResponse>(`/v1/assets/${encodeURIComponent(ticker)}/quote`);
  }

  async getAssetIntraday(ticker: string, interval = "5min"): Promise<IntradayResponse> {
    const params = new URLSearchParams({ interval });
    return this.request<IntradayResponse>(`/v1/assets/${encodeURIComponent(ticker)}/intraday?${params}`);
  }

  async currentPrincipal(): Promise<PrincipalResponse> {
    return this.request<PrincipalResponse>("/v1/me", { auth: true });
  }

  async usage(): Promise<UsageResponse> {
    return this.request<UsageResponse>("/v1/usage", { auth: true });
  }

  async listPortfolios(): Promise<PortfolioListResponse> {
    return this.request<PortfolioListResponse>("/v1/portfolios", { auth: true });
  }

  async createPortfolio(body: CreatePortfolioRequest): Promise<PortfolioResponse> {
    return this.request<PortfolioResponse>("/v1/portfolios", { auth: true, method: "POST", body });
  }

  async getPortfolio(id: string): Promise<PortfolioResponse> {
    return this.request<PortfolioResponse>(`/v1/portfolios/${encodeURIComponent(id)}`, { auth: true });
  }

  async updatePortfolio(id: string, body: UpdatePortfolioRequest): Promise<PortfolioResponse> {
    return this.request<PortfolioResponse>(`/v1/portfolios/${encodeURIComponent(id)}`, { auth: true, method: "PATCH", body });
  }

  async deletePortfolio(id: string): Promise<void> {
    await this.request<void>(`/v1/portfolios/${encodeURIComponent(id)}`, { auth: true, method: "DELETE", empty: true });
  }

  async addHolding(id: string, body: AddHoldingRequest): Promise<PortfolioResponse> {
    return this.request<PortfolioResponse>(`/v1/portfolios/${encodeURIComponent(id)}/holdings`, { auth: true, method: "POST", body });
  }

  async listWatchlists(): Promise<WatchlistListResponse> {
    return this.request<WatchlistListResponse>("/v1/watchlists", { auth: true });
  }

  async createWatchlist(body: CreateWatchlistRequest): Promise<WatchlistResponse> {
    return this.request<WatchlistResponse>("/v1/watchlists", { auth: true, method: "POST", body });
  }

  async addWatchlistItem(id: string, body: AddWatchlistItemRequest): Promise<WatchlistResponse> {
    return this.request<WatchlistResponse>(`/v1/watchlists/${encodeURIComponent(id)}/items`, { auth: true, method: "POST", body });
  }

  async listResearchWorkspaces(): Promise<ResearchWorkspaceListResponse> {
    return this.request<ResearchWorkspaceListResponse>("/v1/research/workspaces", { auth: true });
  }

  async createResearchWorkspace(body: { name?: string; description?: string }): Promise<ResearchWorkspaceResponse> {
    return this.request<ResearchWorkspaceResponse>("/v1/research/workspaces", { auth: true, method: "POST", body });
  }

  async getResearchWorkspace(workspaceId: string): Promise<ResearchWorkspaceResponse> {
    return this.request<ResearchWorkspaceResponse>(`/v1/research/workspaces/${encodeURIComponent(workspaceId)}`, { auth: true });
  }

  async listResearchDocuments(workspaceId: string): Promise<ResearchDocumentListResponse> {
    return this.request<ResearchDocumentListResponse>(`/v1/research/workspaces/${encodeURIComponent(workspaceId)}/documents`, { auth: true });
  }

  async uploadResearchDocument(workspaceId: string, formData: FormData): Promise<ResearchDocumentResponse> {
    return this.request<ResearchDocumentResponse>(`/v1/research/workspaces/${encodeURIComponent(workspaceId)}/documents`, { auth: true, method: "POST", formData });
  }

  async getResearchDocument(workspaceId: string, documentId: string): Promise<ResearchDocumentResponse> {
    return this.request<ResearchDocumentResponse>(`/v1/research/workspaces/${encodeURIComponent(workspaceId)}/documents/${encodeURIComponent(documentId)}`, { auth: true });
  }

  async retryResearchDocument(workspaceId: string, documentId: string): Promise<ResearchDocumentResponse> {
    return this.request<ResearchDocumentResponse>(`/v1/research/workspaces/${encodeURIComponent(workspaceId)}/documents/${encodeURIComponent(documentId)}/retry`, { auth: true, method: "POST" });
  }

  async listResearchDocumentPages(workspaceId: string, documentId: string): Promise<ResearchPageListResponse> {
    return this.request<ResearchPageListResponse>(`/v1/research/workspaces/${encodeURIComponent(workspaceId)}/documents/${encodeURIComponent(documentId)}/pages`, { auth: true });
  }

  async searchResearchEvidence(workspaceId: string, body: ResearchSearchRequest): Promise<ResearchSearchResponse> {
    return this.request<ResearchSearchResponse>(`/v1/research/workspaces/${encodeURIComponent(workspaceId)}/search`, {
      auth: true,
      method: "POST",
      body,
    });
  }

  async listResearchAnalysisReviewEvents(
    workspaceId: string,
    runId: string,
  ): Promise<ResearchAnalysisReviewEventListResponse> {
    return this.request<ResearchAnalysisReviewEventListResponse>(
      `/v1/research/workspaces/${encodeURIComponent(workspaceId)}/analysis-runs/${encodeURIComponent(runId)}/review-events`,
      { auth: true },
    );
  }

  async appendResearchAnalysisReviewEvent(
    workspaceId: string,
    runId: string,
    body: AppendResearchAnalysisReviewEventRequest,
  ): Promise<ResearchAnalysisReviewEventResponse> {
    return this.request<ResearchAnalysisReviewEventResponse>(
      `/v1/research/workspaces/${encodeURIComponent(workspaceId)}/analysis-runs/${encodeURIComponent(runId)}/review-events`,
      { auth: true, method: "POST", body },
    );
  }

  private async request<T>(
    path: string,
    options: { auth?: boolean; method?: string; body?: unknown; formData?: FormData; empty?: boolean } = {},
  ): Promise<T> {
    const headers = new Headers({ Accept: "application/json" });
    const init: RequestInit = { headers, method: options.method ?? "GET" };
    if (options.auth && this.getToken) {
      const token = await this.getToken();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    }
    if (options.body !== undefined) {
      headers.set("Content-Type", "application/json");
      init.body = JSON.stringify(options.body);
    }
    if (options.formData !== undefined) {
      init.body = options.formData;
    }

    const response = await this.fetcher(`${this.baseUrl}${path}`, init);
    if (!response.ok) {
      throw new Error(`Finance API request failed: ${response.status}`);
    }
    if (options.empty || response.status === 204) {
      return undefined as T;
    }
    return response.json() as Promise<T>;
  }
}
