import "server-only";

declare global {
  var __apertureResearchControllers: Map<string, AbortController> | undefined;
}

const controllers =
  globalThis.__apertureResearchControllers ??
  (globalThis.__apertureResearchControllers = new Map<
    string,
    AbortController
  >());

export function registerResearchRunController(
  runId: string,
  controller: AbortController,
) {
  controllers.set(runId, controller);
}

export function unregisterResearchRunController(runId: string) {
  controllers.delete(runId);
}

export function abortResearchRun(runId: string) {
  const controller = controllers.get(runId);
  if (!controller) return false;
  controller.abort(new DOMException("Research run cancelled.", "AbortError"));
  return true;
}

