"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { createEmptyEducationState, EDUCATION_STORAGE_KEY, type EducationState } from "@/lib/education";

const EDUCATION_CHANGE_EVENT = "aperture-education-change";

function readState(): EducationState {
  if (typeof window === "undefined") return createEmptyEducationState();
  try {
    const raw = window.localStorage.getItem(EDUCATION_STORAGE_KEY);
    if (!raw) return createEmptyEducationState();
    const parsed = JSON.parse(raw) as Partial<EducationState>;
    const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
    return {
      ...createEmptyEducationState(),
      ...parsed,
      progress: isRecord(parsed.progress) ? parsed.progress as EducationState["progress"] : {},
      strategySpecifications: Array.isArray(parsed.strategySpecifications) ? parsed.strategySpecifications : [],
      journalEntries: Array.isArray(parsed.journalEntries) ? parsed.journalEntries : [],
      artifacts: Array.isArray(parsed.artifacts) ? parsed.artifacts : [],
    };
  } catch {
    return createEmptyEducationState();
  }
}

export function useEducationState() {
  const [state, setState] = useState<EducationState>(createEmptyEducationState);
  const [hydrated, setHydrated] = useState(false);
  const lastWrittenState = useRef<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setState(readState());
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    function handleChange() {
      setState(readState());
    }
    function handleStorage(event: StorageEvent) {
      if (event.key === EDUCATION_STORAGE_KEY) handleChange();
    }
    window.addEventListener(EDUCATION_CHANGE_EVENT, handleChange);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(EDUCATION_CHANGE_EVENT, handleChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const serialized = JSON.stringify(state);
    if (serialized === lastWrittenState.current) return;
    window.localStorage.setItem(EDUCATION_STORAGE_KEY, serialized);
    lastWrittenState.current = serialized;
    window.dispatchEvent(new Event(EDUCATION_CHANGE_EVENT));
  }, [hydrated, state]);

  const updateState = useCallback((update: (current: EducationState) => EducationState) => {
    setState((current) => update(current));
  }, []);

  return { state, updateState, hydrated };
}
