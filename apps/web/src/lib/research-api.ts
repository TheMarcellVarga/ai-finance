export type ResearchWorkspace = {
  id: string;
  name: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type ResearchDocument = {
  id: string;
  workspaceId: string;
  title: string;
  originalFilename: string;
  mimeType: string;
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

export type ResearchMeta = {
  persistence: string;
  storage?: string;
};

export type ResearchResponse<T> = {
  data: T;
  meta: ResearchMeta;
};

export type ResearchApiResult<T> = {
  status: number;
  payload: ResearchResponse<T> | { error: { code: string; message: string; requestId?: string } };
};

const financeApiBaseUrl =
  process.env.FINANCE_API_BASE_URL ?? process.env.API_URL ?? "http://127.0.0.1:8080";

async function researchRequest<T>(
  path: string,
  authToken: string,
  init?: RequestInit,
): Promise<ResearchApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(`${financeApiBaseUrl}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${authToken}`,
        ...init?.headers,
      },
      cache: "no-store",
    });
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `The research API is unavailable: ${error.message}`
        : "The research API is unavailable.",
    );
  }
  const text = await response.text();
  const payload = text
    ? (JSON.parse(text) as ResearchApiResult<T>["payload"])
    : { error: { code: "empty_response", message: "The research API returned an empty response." } };
  return { status: response.status, payload };
}

function requireData<T>(result: ResearchApiResult<T>): ResearchResponse<T> {
  if (result.status < 200 || result.status > 299 || !("data" in result.payload)) {
    throw new Error(
      "error" in result.payload
        ? result.payload.error.message
        : `The research API returned ${result.status}.`,
    );
  }
  return result.payload;
}

export async function listResearchWorkspaces(authToken: string) {
  return requireData(
    await researchRequest<ResearchWorkspace[]>("/v1/research/workspaces", authToken),
  );
}

export async function createResearchWorkspace(authToken: string) {
  return requireData(
    await researchRequest<ResearchWorkspace>("/v1/research/workspaces", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Primary research workspace",
        description: "Private source documents and page-aware evidence for investment research.",
      }),
    }),
  );
}

export async function loadPrimaryResearchWorkspace(authToken: string) {
  const workspaces = await listResearchWorkspaces(authToken);
  const workspace =
    workspaces.data[0] ?? (await createResearchWorkspace(authToken)).data;
  const documents = await listResearchDocuments(workspace.id, authToken);
  return { workspace, documents: documents.data, meta: documents.meta };
}

export async function listResearchDocuments(workspaceId: string, authToken: string) {
  return requireData(
    await researchRequest<ResearchDocument[]>(
      `/v1/research/workspaces/${encodeURIComponent(workspaceId)}/documents`,
      authToken,
    ),
  );
}

export function proxyResearchDocuments(workspaceId: string, authToken: string) {
  return researchRequest<ResearchDocument[]>(
    `/v1/research/workspaces/${encodeURIComponent(workspaceId)}/documents`,
    authToken,
  );
}

export function uploadResearchDocument(
  workspaceId: string,
  authToken: string,
  formData: FormData,
) {
  return researchRequest<ResearchDocument>(
    `/v1/research/workspaces/${encodeURIComponent(workspaceId)}/documents`,
    authToken,
    { method: "POST", body: formData },
  );
}

export function retryResearchDocument(
  workspaceId: string,
  documentId: string,
  authToken: string,
) {
  return researchRequest<ResearchDocument>(
    `/v1/research/workspaces/${encodeURIComponent(workspaceId)}/documents/${encodeURIComponent(documentId)}/retry`,
    authToken,
    { method: "POST" },
  );
}
