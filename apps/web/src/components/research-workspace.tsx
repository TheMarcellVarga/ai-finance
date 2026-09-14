"use client";

import {
  ChangeEvent,
  DragEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertTriangle,
  Check,
  FileText,
  FolderLock,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
  Search as SearchIcon,
  ShieldCheck,
  UploadCloud,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { StructuredResearchPanel } from "@/components/structured-research-panel";
import { WorkspaceWaveAccent } from "@/components/workspace-wave-accent";
import type {
  ResearchDocument,
  ResearchMeta,
  ResearchResponse,
  ResearchSearchResponse,
  ResearchWorkspace as ResearchWorkspaceType,
} from "@/lib/research-api";

type ResearchWorkspaceProps = {
  workspace?: ResearchWorkspaceType;
  initialDocuments?: ResearchDocument[];
  initialMeta?: ResearchMeta;
  initialError?: string;
};

type RouteError = { error?: { message?: string } };

const statusDetails: Record<
  ResearchDocument["status"],
  { label: string; className: string }
> = {
  uploading: {
    label: "Securing upload",
    className: "bg-sky-200/8 text-sky-100",
  },
  queued: {
    label: "Queued",
    className: "bg-amber-200/8 text-amber-100",
  },
  processing: {
    label: "Indexing evidence",
    className: "bg-cyan-200/8 text-cyan-100",
  },
  ready: {
    label: "Ready",
    className: "bg-emerald-200/8 text-emerald-100",
  },
  failed: {
    label: "Needs attention",
    className: "bg-rose-200/8 text-rose-100",
  },
};

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KiB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MiB`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function payloadError(
  payload: ResearchResponse<unknown> | RouteError,
  fallback: string,
) {
  return "error" in payload ? (payload.error?.message ?? fallback) : fallback;
}

export function ResearchWorkspace({
  workspace,
  initialDocuments,
  initialMeta,
  initialError,
}: ResearchWorkspaceProps) {
  const [documents, setDocuments] = useState(initialDocuments ?? []);
  const [meta, setMeta] = useState(initialMeta);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [notice, setNotice] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResponse, setSearchResponse] =
    useState<ResearchSearchResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeDocuments = useMemo(
    () =>
      documents.filter(
        (document) =>
          document.status === "uploading" ||
          document.status === "queued" ||
          document.status === "processing",
      ),
    [documents],
  );
  const readyCount = documents.filter(
    (document) => document.status === "ready",
  ).length;
  const readyDocuments = useMemo(
    () => documents.filter((document) => document.status === "ready"),
    [documents],
  );
  const pageCount = documents.reduce(
    (total, document) => total + document.pageCount,
    0,
  );

  const refreshDocuments = useCallback(
    async (announce = false) => {
      if (!workspace) return;
      if (announce) setRefreshing(true);
      try {
        const response = await fetch(
          `/api/research/workspaces/${encodeURIComponent(workspace.id)}/documents`,
          { cache: "no-store" },
        );
        const payload = (await response.json()) as
          | ResearchResponse<ResearchDocument[]>
          | RouteError;
        if (!response.ok || !("data" in payload)) {
          throw new Error(
            payloadError(payload, "Document status could not be refreshed."),
          );
        }
        setDocuments(payload.data);
        setMeta(payload.meta);
        setError(null);
        if (announce) setNotice("Document status refreshed.");
      } catch (requestError) {
        if (announce) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Document status could not be refreshed.",
          );
        }
      } finally {
        if (announce) setRefreshing(false);
      }
    },
    [workspace],
  );

  useEffect(() => {
    if (activeDocuments.length === 0) return;
    const interval = window.setInterval(() => {
      void refreshDocuments();
    }, 2000);
    return () => window.clearInterval(interval);
  }, [activeDocuments.length, refreshDocuments]);

  function chooseFile(selected: File | null) {
    setError(null);
    setNotice(null);
    if (!selected) {
      setFile(null);
      return;
    }
    const extension = selected.name.toLowerCase().split(".").pop();
    if (extension !== "pdf" && extension !== "txt") {
      setError("Choose a PDF or UTF-8 text document.");
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      setError("Files must be 10 MiB or smaller.");
      return;
    }
    setFile(selected);
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    chooseFile(event.target.files?.[0] ?? null);
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    chooseFile(event.dataTransfer.files?.[0] ?? null);
  }

  async function uploadDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workspace || !file) {
      setError("Choose a PDF or text document before uploading.");
      return;
    }
    setUploading(true);
    setError(null);
    setNotice(null);
    const formData = new FormData();
    formData.set("file", file);
    if (title.trim()) formData.set("title", title.trim());
    try {
      const response = await fetch(
        `/api/research/workspaces/${encodeURIComponent(workspace.id)}/documents`,
        { method: "POST", body: formData },
      );
      const payload = (await response.json()) as
        | ResearchResponse<ResearchDocument>
        | RouteError;
      if (!response.ok || !("data" in payload)) {
        throw new Error(payloadError(payload, "The document could not be uploaded."));
      }
      setDocuments((current) => [
        payload.data,
        ...current.filter((document) => document.id !== payload.data.id),
      ]);
      setMeta(payload.meta);
      setFile(null);
      setTitle("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setNotice("Upload secured. Page extraction has started.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The document could not be uploaded.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function retryDocument(document: ResearchDocument) {
    if (!workspace) return;
    setRetryingId(document.id);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(
        `/api/research/workspaces/${encodeURIComponent(workspace.id)}/documents/${encodeURIComponent(document.id)}/retry`,
        { method: "POST" },
      );
      const payload = (await response.json()) as
        | ResearchResponse<ResearchDocument>
        | RouteError;
      if (!response.ok || !("data" in payload)) {
        throw new Error(payloadError(payload, "Processing could not be retried."));
      }
      setDocuments((current) =>
        current.map((item) => (item.id === payload.data.id ? payload.data : item)),
      );
      setNotice("Document processing queued for another attempt.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Processing could not be retried.",
      );
    } finally {
      setRetryingId(null);
    }
  }

  function toggleDocumentFilter(documentId: string) {
    setSelectedDocumentIds((current) =>
      current.includes(documentId)
        ? current.filter((value) => value !== documentId)
        : [...current, documentId],
    );
  }

  async function searchEvidence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workspace || searchQuery.trim().length < 2) {
      setSearchError("Enter at least two characters to search your evidence.");
      return;
    }
    setSearching(true);
    setSearchError(null);
    setSearchResponse(null);
    try {
      const response = await fetch(
        `/api/research/workspaces/${encodeURIComponent(workspace.id)}/search`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: searchQuery.trim(),
            limit: 8,
            documentIds: selectedDocumentIds,
          }),
        },
      );
      const payload = (await response.json()) as
        | ResearchResponse<ResearchSearchResponse>
        | RouteError;
      if (!response.ok || !("data" in payload)) {
        throw new Error(
          payloadError(payload, "Evidence search could not be completed."),
        );
      }
      setSearchResponse(payload.data);
      setMeta(payload.meta);
    } catch (requestError) {
      setSearchError(
        requestError instanceof Error
          ? requestError.message
          : "Evidence search could not be completed.",
      );
    } finally {
      setSearching(false);
    }
  }

  if (!workspace) {
    return (
      <section className="glass-surface rounded-[1.25rem] p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-1 size-5 text-amber-200" />
          <div>
            <h1 className="type-card-title text-xl text-white">
              Research workspace unavailable
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              {error ??
                "Start the finance API and confirm the research persistence settings."}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="section-shell relative overflow-hidden rounded-[1.25rem] p-6 sm:p-8 lg:p-10">
        <WorkspaceWaveAccent className="pointer-events-none absolute right-4 top-3 hidden sm:block lg:right-8 lg:top-5" />
        <div className="grid gap-7 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-3xl">
            <p className="type-label inline-flex items-center gap-2 rounded-[0.9rem] bg-cyan-200/8 px-4 py-2 text-xs uppercase text-cyan-100">
              <FolderLock className="size-3.5" />
              Private research room
            </p>
            <h1 className="type-display mt-6 text-3xl text-white sm:text-5xl">
              Evidence before interpretation
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400">
              Secure source documents, preserve page boundaries, and retrieve
              traceable evidence before forming a research view.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-px overflow-hidden rounded-[1rem] border border-white/7 bg-white/7">
            {[
              ["Sources", documents.length],
              ["Ready", readyCount],
              ["Pages", pageCount],
            ].map(([label, value]) => (
              <div key={label} className="min-w-24 bg-zinc-950/90 px-4 py-4">
                <p className="text-xs text-zinc-500">{label}</p>
                <p className="mt-1 font-mono text-xl text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div aria-live="polite" aria-atomic="true">
        {error ? (
          <div role="alert" className="flex items-start gap-3 rounded-[1rem] border border-rose-200/10 bg-rose-200/6 p-4">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-rose-100" />
            <p className="text-sm leading-6 text-rose-50">{error}</p>
          </div>
        ) : null}
        {notice ? (
          <div role="status" className="flex items-start gap-3 rounded-[1rem] border border-emerald-200/10 bg-emerald-200/6 p-4">
            <Check className="mt-0.5 size-4 shrink-0 text-emerald-100" />
            <p className="text-sm leading-6 text-emerald-50">{notice}</p>
          </div>
        ) : null}
      </div>

      <StructuredResearchPanel
        workspaceId={workspace.id}
        readyDocuments={readyDocuments}
      />

      <section className="glass-surface overflow-hidden rounded-[1.25rem]">
        <div className="border-b border-white/7 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <SearchIcon className="mt-1 size-5 text-cyan-100" />
            <div>
              <h2 className="type-card-title text-xl text-white">
                Search source evidence
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
                Find relevant passages across ready documents. Every result keeps
                its document and page reference.
              </p>
            </div>
          </div>

          <form onSubmit={searchEvidence} className="mt-6">
            <label htmlFor="evidence-query" className="block text-sm text-zinc-200">
              Research question or evidence phrase
            </label>
            <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_auto]">
              <input
                id="evidence-query"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                minLength={2}
                maxLength={500}
                placeholder="What supplier concentration risks were disclosed?"
                className="h-11 min-w-0 rounded-lg border border-white/10 bg-black/25 px-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-cyan-200/45 focus:ring-2 focus:ring-cyan-200/15"
              />
              <Button
                type="submit"
                size="lg"
                disabled={
                  searching ||
                  readyDocuments.length === 0 ||
                  searchQuery.trim().length < 2
                }
              >
                <SearchIcon className="size-4" />
                {searching ? "Searching" : "Search evidence"}
              </Button>
            </div>

            <fieldset className="mt-5">
              <legend className="text-xs text-zinc-500">
                Document scope
              </legend>
              {readyDocuments.length > 0 ? (
                <div className="mt-2 flex snap-x gap-2 overflow-x-auto pb-1">
                  <label className="shrink-0 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedDocumentIds.length === 0}
                      onChange={() => setSelectedDocumentIds([])}
                      className="peer sr-only"
                    />
                    <span className="inline-flex h-9 items-center rounded-lg border border-white/10 bg-white/[0.025] px-3 text-xs text-zinc-300 transition-colors peer-checked:border-cyan-200/35 peer-checked:bg-cyan-200/8 peer-checked:text-cyan-50 peer-focus-visible:ring-2 peer-focus-visible:ring-cyan-200/60">
                      All ready sources
                    </span>
                  </label>
                  {readyDocuments.map((document) => (
                    <label key={document.id} className="shrink-0 cursor-pointer snap-start">
                      <input
                        type="checkbox"
                        checked={selectedDocumentIds.includes(document.id)}
                        onChange={() => toggleDocumentFilter(document.id)}
                        className="peer sr-only"
                      />
                      <span className="inline-flex h-9 max-w-64 items-center truncate rounded-lg border border-white/10 bg-white/[0.025] px-3 text-xs text-zinc-400 transition-colors peer-checked:border-cyan-200/35 peer-checked:bg-cyan-200/8 peer-checked:text-cyan-50 peer-focus-visible:ring-2 peer-focus-visible:ring-cyan-200/60">
                        {document.title}
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-zinc-500">
                  Upload and finish processing a source before searching.
                </p>
              )}
            </fieldset>
          </form>

          <div aria-live="polite" aria-atomic="true">
            {searchError ? (
              <div role="alert" className="mt-5 flex items-start gap-3 rounded-[1rem] border border-rose-200/10 bg-rose-200/6 p-4">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-rose-100" />
                <p className="text-sm leading-6 text-rose-50">{searchError}</p>
              </div>
            ) : null}
          </div>
        </div>

        <div aria-busy={searching} className="min-h-48">
          {searching ? (
            <div aria-hidden="true" className="space-y-0 divide-y divide-white/7">
              {[0, 1, 2].map((item) => (
                <div key={item} className="animate-pulse p-5 sm:p-6">
                  <div className="h-3 w-40 rounded bg-white/8" />
                  <div className="mt-4 h-3 w-full rounded bg-white/6" />
                  <div className="mt-2 h-3 w-4/5 rounded bg-white/6" />
                </div>
              ))}
            </div>
          ) : searchResponse?.results.length ? (
            <>
              <div className="divide-y divide-white/7">
                {searchResponse.results.map((result, index) => (
                  <article key={result.chunkId} className="p-5 sm:p-6">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-medium text-white">
                          {result.documentTitle}
                        </h3>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
                          <span>Page {result.pageNumber}</span>
                          <span>Result {index + 1}</span>
                          <span>{result.sourceLocator}</span>
                        </div>
                      </div>
                      <span className="font-mono text-xs text-cyan-100">
                        Score {result.combinedScore.toFixed(4)}
                      </span>
                    </div>
                    <p className="mt-4 max-w-4xl text-sm leading-7 text-zinc-300">
                      {result.snippet}
                    </p>
                  </article>
                ))}
              </div>
              <details className="border-t border-white/7 px-5 py-4 text-xs text-zinc-500 sm:px-6">
                <summary className="cursor-pointer text-zinc-300 outline-none focus-visible:text-cyan-50">
                  Retrieval diagnostics
                </summary>
                <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <dt>Embedding index</dt>
                    <dd className="mt-1 break-words font-mono text-zinc-300">
                      {searchResponse.diagnostics.embedding.model}
                      {" / "}
                      {searchResponse.diagnostics.embedding.version}
                    </dd>
                  </div>
                  <div>
                    <dt>Candidates and results</dt>
                    <dd className="mt-1 font-mono text-zinc-300">
                      {searchResponse.diagnostics.candidateCount}
                      {" / "}
                      {searchResponse.diagnostics.resultCount}
                    </dd>
                  </div>
                  <div>
                    <dt>Duplicates suppressed</dt>
                    <dd className="mt-1 font-mono text-zinc-300">
                      {searchResponse.diagnostics.duplicatesSuppressed}
                    </dd>
                  </div>
                  <div>
                    <dt>Total retrieval time</dt>
                    <dd className="mt-1 font-mono text-zinc-300">
                      {searchResponse.diagnostics.stageTimingsMs.total ?? 0} ms
                    </dd>
                  </div>
                  <div className="sm:col-span-2 lg:col-span-4">
                    <dt>Run ID</dt>
                    <dd className="mt-1 break-all font-mono text-zinc-300">
                      {searchResponse.diagnostics.runId}
                    </dd>
                  </div>
                </dl>
              </details>
            </>
          ) : searchResponse ? (
            <div className="grid min-h-48 place-items-center p-8 text-center">
              <div className="max-w-md">
                <SearchIcon className="mx-auto size-7 text-zinc-700" />
                <h3 className="mt-4 text-sm font-medium text-zinc-200">
                  No matching evidence
                </h3>
                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  Try exact terminology from the source, broaden the document
                  scope, or use a shorter question.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid min-h-48 place-items-center p-8 text-center">
              <div className="max-w-md">
                <SearchIcon className="mx-auto size-7 text-zinc-700" />
                <p className="mt-3 text-sm leading-6 text-zinc-500">
                  Search results will appear here with document and page citations.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.36fr_0.64fr]">
        <form
          onSubmit={uploadDocument}
          className="glass-surface rounded-[1.25rem] p-5 sm:p-6"
        >
          <div className="flex items-start gap-3">
            <UploadCloud className="mt-1 size-5 text-cyan-100" />
            <div>
              <h2 className="type-card-title text-xl text-white">Add source material</h2>
              <p className="mt-1 text-sm leading-6 text-zinc-500">
                PDF or UTF-8 text, maximum 10 MiB
              </p>
            </div>
          </div>

          <label
            onDragEnter={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`mt-6 flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-[1rem] border border-dashed px-5 text-center outline-none transition-colors focus-within:ring-2 focus-within:ring-cyan-200/60 ${
              dragging
                ? "border-cyan-200/50 bg-cyan-200/8"
                : "border-white/12 bg-black/20 hover:border-white/25"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,application/pdf,text/plain"
              onChange={onFileChange}
              className="sr-only"
            />
            {file ? (
              <>
                <FileText className="size-7 text-cyan-100" />
                <span className="mt-3 max-w-full truncate text-sm font-medium text-white">
                  {file.name}
                </span>
                <span className="mt-1 text-xs text-zinc-500">
                  {formatBytes(file.size)}
                </span>
              </>
            ) : (
              <>
                <UploadCloud className="size-7 text-zinc-500" />
                <span className="mt-3 text-sm text-zinc-200">
                  Drop a document or browse
                </span>
                <span className="mt-1 text-xs leading-5 text-zinc-500">
                  File signatures are verified before storage.
                </span>
              </>
            )}
          </label>

          {file ? (
            <button
              type="button"
              onClick={() => chooseFile(null)}
              className="mt-3 inline-flex min-h-9 items-center gap-2 text-xs text-zinc-500 outline-none hover:text-white focus-visible:text-white"
            >
              <X className="size-3.5" />
              Clear selection
            </button>
          ) : null}

          <label className="mt-5 block">
            <span className="text-xs uppercase tracking-[0.14em] text-zinc-500">
              Display title <span className="normal-case tracking-normal">(optional)</span>
            </span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={200}
              placeholder={file?.name ?? "Quarterly filing notes"}
              className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/25 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-cyan-200/45 focus:ring-2 focus:ring-cyan-200/15"
            />
          </label>

          <Button type="submit" disabled={!file || uploading} className="mt-5 w-full">
            {uploading ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <ShieldCheck className="size-4" />
            )}
            {uploading ? "Securing document" : "Upload privately"}
          </Button>
          <p className="mt-4 text-xs leading-5 text-zinc-600">
            Files remain private and are processed server-side. Upload source
            material you are authorized to store.
          </p>
        </form>

        <div className="glass-surface overflow-hidden rounded-[1.25rem]">
          <div className="flex flex-col gap-4 border-b border-white/7 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="type-card-title text-xl text-white">
                Source processing ledger
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                {workspace.name}
                <span className="ml-2 text-zinc-600">
                  {meta?.persistence ?? "private"} persistence
                </span>
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => void refreshDocuments(true)}
              disabled={refreshing}
            >
              <RefreshCw className={refreshing ? "size-4 animate-spin" : "size-4"} />
              {refreshing ? "Refreshing" : "Refresh"}
            </Button>
          </div>

          {documents.length === 0 ? (
            <div className="grid min-h-72 place-items-center p-8 text-center">
              <div className="max-w-sm">
                <FileText className="mx-auto size-8 text-zinc-700" />
                <h3 className="mt-4 text-sm font-medium text-zinc-200">
                  No source documents yet
                </h3>
                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  Upload the first document to establish a page-aware evidence
                  foundation for later retrieval and citations.
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-white/7">
              {documents.map((document) => {
                const status = statusDetails[document.status];
                const isActive =
                  document.status === "queued" ||
                  document.status === "processing" ||
                  document.status === "uploading";
                return (
                  <article
                    key={document.id}
                    className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-medium text-white">
                          {document.title}
                        </h3>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.68rem] ${status.className}`}
                        >
                          {isActive ? (
                            <LoaderCircle className="size-3 animate-spin" />
                          ) : document.status === "ready" ? (
                            <Check className="size-3" />
                          ) : (
                            <AlertTriangle className="size-3" />
                          )}
                          {status.label}
                        </span>
                      </div>
                      <p className="mt-2 truncate text-xs text-zinc-500">
                        {document.originalFilename}
                        <span className="ml-2">{formatBytes(document.byteSize)}</span>
                        <span className="ml-2">{formatDate(document.createdAt)}</span>
                      </p>
                      {document.errorMessage ? (
                        <p className="mt-2 text-xs leading-5 text-rose-100/80">
                          {document.errorMessage}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center justify-between gap-4 md:justify-end">
                      <div className="text-right">
                        <p className="font-mono text-sm text-zinc-200">
                          {document.pageCount || "-"}
                        </p>
                        <p className="mt-1 text-[0.68rem] uppercase tracking-[0.12em] text-zinc-600">
                          pages
                        </p>
                      </div>
                      {document.status === "failed" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={retryingId === document.id}
                          onClick={() => void retryDocument(document)}
                        >
                          <RotateCcw
                            className={
                              retryingId === document.id
                                ? "size-3.5 animate-spin"
                                : "size-3.5"
                            }
                          />
                          Retry
                        </Button>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[1rem] border border-white/6 bg-black/20 px-5 py-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-cyan-100" />
          <p className="text-xs leading-5 text-zinc-500">
            Document status and extracted page counts describe processing state,
            not investment quality. Aperture provides research support and does
            not provide personalized financial advice.
          </p>
        </div>
      </section>
    </div>
  );
}
