export type Asset = {
  ticker: string;
  name: string;
  exchange: string;
  type: "equity" | "etf";
  sector?: string;
  cik?: string;
};

export type AssetSearchResponse = {
  data: Asset[];
  meta: {
    query?: string;
    provider: string;
    freshness: string;
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
    features: Array<{
      feature: string;
      used: number;
      limit: number;
      status: string;
    }>;
  };
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

  async searchAssets(query: string): Promise<AssetSearchResponse> {
    const params = new URLSearchParams();
    if (query) {
      params.set("q", query);
    }
    return this.request<AssetSearchResponse>(`/v1/assets/search?${params}`);
  }

  async currentPrincipal(): Promise<PrincipalResponse> {
    return this.request<PrincipalResponse>("/v1/me", { auth: true });
  }

  async usage(): Promise<UsageResponse> {
    return this.request<UsageResponse>("/v1/usage", { auth: true });
  }

  private async request<T>(path: string, options: { auth?: boolean } = {}): Promise<T> {
    const headers = new Headers({ Accept: "application/json" });
    if (options.auth && this.getToken) {
      const token = await this.getToken();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    }

    const response = await this.fetcher(`${this.baseUrl}${path}`, { headers });
    if (!response.ok) {
      throw new Error(`Finance API request failed: ${response.status}`);
    }
    return response.json() as Promise<T>;
  }
}
