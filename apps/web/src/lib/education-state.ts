"use client";

import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  createEmptyEducationState,
  EDUCATION_STORAGE_KEY,
  type BacktestAuditChecklist,
  type EducationState,
  type EvidenceStatus,
  type StrategySpecification,
} from "@/lib/education";

const MAX_PROGRESS_RECORDS = 100;
const MAX_STRATEGY_VERSIONS = 50;
const MAX_CONSTITUTION_VERSIONS = 25;
const MAX_JOURNAL_ENTRIES = 200;
const MAX_ARTIFACTS = 300;

type EducationStateContextValue = {
  state: EducationState;
  updateState: (update: (current: EducationState) => EducationState) => void;
  hydrated: boolean;
  persistenceError: string | null;
};

const EducationStateContext = createContext<EducationStateContextValue | null>(null);

export function getEducationStorageKey(userId: string) {
  return `${EDUCATION_STORAGE_KEY}.account.${userId}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeEvidenceStatus(value: unknown): EvidenceStatus {
  if (value === "confirmed" || value === true) return "confirmed";
  if (value === "missing" || value === false) return "missing";
  return "unknown";
}

function normalizeBacktestAudit(value: unknown): BacktestAuditChecklist | undefined {
  if (!isRecord(value)) return undefined;
  return {
    universeAndDates: normalizeEvidenceStatus(value.universeAndDates),
    pointInTimeData: normalizeEvidenceStatus(value.pointInTimeData),
    outOfSample: normalizeEvidenceStatus(value.outOfSample),
    costsIncluded: normalizeEvidenceStatus(value.costsIncluded),
    executionDelay: normalizeEvidenceStatus(value.executionDelay),
    delistedAssets: normalizeEvidenceStatus(value.delistedAssets),
    reproducible: normalizeEvidenceStatus(value.reproducible),
    limitations: typeof value.limitations === "string" ? value.limitations : "",
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : "",
  };
}

function normalizeStrategy(value: StrategySpecification): StrategySpecification {
  return { ...value, seriesId: value.seriesId || `legacy-${value.name.trim().toLowerCase()}` };
}

export function parseEducationState(raw: string | null): EducationState {
  if (!raw) return createEmptyEducationState();
  try {
    const parsed = JSON.parse(raw) as Partial<EducationState>;
    const progressEntries = isRecord(parsed.progress) ? Object.entries(parsed.progress).slice(0, MAX_PROGRESS_RECORDS) : [];
    const strategies = Array.isArray(parsed.strategySpecifications)
      ? parsed.strategySpecifications.slice(0, MAX_STRATEGY_VERSIONS).map((item) => normalizeStrategy(item))
      : [];
    const constitutionVersions = Array.isArray(parsed.constitutionVersions)
      ? parsed.constitutionVersions.slice(0, MAX_CONSTITUTION_VERSIONS)
      : parsed.constitution
        ? [parsed.constitution]
        : [];
    return {
      ...createEmptyEducationState(),
      ...parsed,
      progress: Object.fromEntries(progressEntries),
      strategySpecifications: strategies,
      constitutionVersions,
      journalEntries: Array.isArray(parsed.journalEntries) ? parsed.journalEntries.slice(0, MAX_JOURNAL_ENTRIES) : [],
      artifacts: Array.isArray(parsed.artifacts) ? parsed.artifacts.slice(0, MAX_ARTIFACTS) : [],
      backtestAudit: normalizeBacktestAudit(parsed.backtestAudit),
    };
  } catch {
    return createEmptyEducationState();
  }
}

function boundedState(state: EducationState): EducationState {
  return {
    ...state,
    progress: Object.fromEntries(Object.entries(state.progress).slice(-MAX_PROGRESS_RECORDS)),
    strategySpecifications: state.strategySpecifications.slice(0, MAX_STRATEGY_VERSIONS),
    constitutionVersions: state.constitutionVersions.slice(0, MAX_CONSTITUTION_VERSIONS),
    journalEntries: state.journalEntries.slice(0, MAX_JOURNAL_ENTRIES),
    artifacts: state.artifacts.slice(0, MAX_ARTIFACTS),
  };
}

export function EducationStateProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const storageKey = useMemo(() => getEducationStorageKey(userId), [userId]);
  const [state, setState] = useState<EducationState>(createEmptyEducationState);
  const [hydrated, setHydrated] = useState(false);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setState(parseEducationState(window.localStorage.getItem(storageKey)));
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key === storageKey) setState(parseEducationState(event.newValue));
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(state));
        setPersistenceError(null);
      } catch {
        setPersistenceError("This browser could not save the study record. Shorten large notes, then try again.");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [hydrated, state, storageKey]);

  const updateState = useCallback((update: (current: EducationState) => EducationState) => {
    setState((current) => boundedState(update(current)));
  }, []);

  const value = useMemo(() => ({ state, updateState, hydrated, persistenceError }), [state, updateState, hydrated, persistenceError]);
  return createElement(EducationStateContext.Provider, { value }, children);
}

export function useEducationState() {
  const value = useContext(EducationStateContext);
  if (!value) throw new Error("useEducationState must be used inside EducationStateProvider.");
  return value;
}
