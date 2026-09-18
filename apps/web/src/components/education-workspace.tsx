"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import {
  ArrowRight,
  BookOpenCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  FlaskConical,
  GraduationCap,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useEducationState } from "@/lib/education-state";
import {
  getArtifactHref,
  getAllLessons,
  type LearningModule,
  type Lesson,
  learningModules,
} from "@/lib/education";

function moduleAccent(module: LearningModule) {
  return module.order % 3 === 0 ? "cyan" : module.order % 3 === 1 ? "amber" : "violet";
}

function moduleProgress(module: LearningModule, progress: ReturnType<typeof useEducationState>["state"]["progress"]) {
  const completed = module.lessons.filter((lesson) => progress[lesson.id]?.contentVersion === lesson.contentVersion && progress[lesson.id]?.status === "completed").length;
  return { completed, total: module.lessons.length, percent: module.lessons.length ? (completed / module.lessons.length) * 100 : 0 };
}

function currentLessonProgress(lesson: Lesson, progress: ReturnType<typeof useEducationState>["state"]["progress"]) {
  const record = progress[lesson.id];
  return record?.contentVersion === lesson.contentVersion ? record : undefined;
}

function statusLabel(status?: string) {
  if (status === "completed") return "Complete";
  if (status === "in_progress") return "In progress";
  return "Not started";
}

function ModuleGlyph({ module, large = false }: { module: LearningModule; large?: boolean }) {
  return (
    <span className={`grid ${large ? "size-12 text-base" : "size-9 text-xs"} place-items-center rounded-[0.8rem] border border-cyan-200/15 bg-cyan-200/[0.05] font-mono text-cyan-100`} aria-hidden="true">
      {module.number}
    </span>
  );
}

function SafeBoundary() {
  return (
    <div className="flex items-start gap-3 rounded-[0.95rem] border border-cyan-200/10 bg-cyan-200/[0.035] p-4 text-xs leading-5 text-zinc-400">
      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-cyan-100/75" aria-hidden="true" />
      <p>Education and decision support only. No lesson, lab, or monitor snapshot is a personalized recommendation, return promise, or order instruction.</p>
    </div>
  );
}

function LocalSaveStatus({ hydrated, persistenceError }: { hydrated: boolean; persistenceError: string | null }) {
  return <p className={`font-mono text-[0.62rem] uppercase tracking-[0.15em] ${persistenceError ? "text-amber-100" : "text-zinc-300"}`}>{persistenceError ? "Local save unavailable" : hydrated ? "Account-scoped browser record" : "Loading study record"}</p>;
}

export function EducationDashboard() {
  const { state, hydrated, persistenceError } = useEducationState();
  const allLessons = getAllLessons();
  const completedLessons = allLessons.filter((lesson) => currentLessonProgress(lesson, state.progress)?.status === "completed").length;
  const nextModule = learningModules.find((module) => module.lessons.some((lesson) => currentLessonProgress(lesson, state.progress)?.status !== "completed")) ?? learningModules.at(-1)!;
  const inProgressLesson = allLessons.find((lesson) => currentLessonProgress(lesson, state.progress)?.status === "in_progress")
    ?? nextModule.lessons.find((lesson) => currentLessonProgress(lesson, state.progress)?.status !== "completed")
    ?? allLessons[0];
  const artifactCount = state.artifacts.length;
  const overallPercent = allLessons.length ? Math.round((completedLessons / allLessons.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <section className="workspace-hero section-shell relative overflow-hidden rounded-[1.25rem] p-6 sm:p-8 lg:p-10">
        <div className="workspace-hero-glow" aria-hidden="true" />
        <div className="relative grid gap-8 xl:grid-cols-[1fr_19rem] xl:items-end">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.16em] text-cyan-100/80">
              <GraduationCap className="size-4" aria-hidden="true" />
              Education system · process over prediction
            </div>
            <h1 className="type-display mt-5 text-4xl text-white sm:text-6xl">Build a process you can inspect.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-300/80">
              An original, interactive course for reading the Market Monitor, defining mechanical rules, sizing risk, testing evidence, and reviewing behavior without pretending uncertainty is gone.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={`/app/learn/${nextModule.slug}/${inProgressLesson.slug}`} className="inline-flex h-10 items-center gap-2 rounded-lg bg-cyan-100 px-4 text-sm font-medium text-[#071012] transition hover:bg-white">
                {completedLessons > 0 ? "Continue study" : "Start with module 00"}<ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link href="/app/crypto-monitor" className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.025] px-4 text-sm text-zinc-200 transition hover:bg-white/[0.07] hover:text-white">
                Open Market Monitor<ExternalLink className="size-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
          <div className="glass-surface rounded-[1rem] p-5">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-300">Your study record</p>
              <LocalSaveStatus hydrated={hydrated} persistenceError={persistenceError} />
            </div>
            <div className="mt-6 flex items-center gap-4">
              <div className="relative grid size-20 place-items-center rounded-full border border-cyan-100/20 bg-cyan-200/[0.06]">
                <div className="absolute inset-1 rounded-full border border-dashed border-cyan-100/20" />
                <span className="font-mono text-xl text-white">{overallPercent}%</span>
              </div>
              <div>
                <p className="text-sm text-white">{completedLessons} of {allLessons.length} lessons</p>
                <p className="mt-2 text-xs leading-5 text-zinc-300">{artifactCount} saved learning artifact{artifactCount === 1 ? "" : "s"}. Progress rewards evidence and consistency, never profit.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SafeBoundary />

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          ["09", "Modules", "From account boundaries to governance", BookOpenCheck],
          ["06", "Labs", "Math, assumptions, and market mechanics", FlaskConical],
          [String(artifactCount).padStart(2, "0"), "Artifacts", "Decisions you can revisit", Target],
        ].map(([value, label, description, Icon]) => (
          <article key={label as string} className="glass-surface rounded-[1rem] p-5">
            <div className="flex items-start justify-between gap-3"><p className="text-xs uppercase tracking-[0.15em] text-zinc-300">{label as string}</p><Icon className="size-4 text-cyan-100/75" aria-hidden="true" /></div>
            <p className="mt-5 font-mono text-2xl text-white">{value as string}</p>
            <p className="mt-2 text-xs leading-5 text-zinc-300">{description as string}</p>
          </article>
        ))}
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div><p className="type-label text-xs uppercase text-cyan-100/75">The curriculum</p><h2 className="type-card-title mt-3 text-2xl text-white">Nine modules. One study loop.</h2></div>
          <p className="hidden font-mono text-[0.62rem] uppercase tracking-[0.15em] text-zinc-300 sm:block">Read · practice · document · review</p>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {learningModules.map((module) => {
            const progress = moduleProgress(module, state.progress);
            const accent = moduleAccent(module);
            return (
              <Link key={module.id} href={`/app/learn/${module.slug}`} className={`group glass-surface rounded-[1.05rem] p-5 transition hover:-translate-y-0.5 hover:bg-[#0c1415] ${accent === "amber" ? "hover:border-amber-200/20" : accent === "violet" ? "hover:border-violet-200/20" : "hover:border-cyan-200/20"}`}>
                <div className="flex items-start gap-4">
                  <ModuleGlyph module={module} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-4"><p className="text-xs uppercase tracking-[0.14em] text-zinc-300">Module {module.number}</p><span className="font-mono text-[0.65rem] text-cyan-100/65">{progress.completed}/{progress.total}</span></div>
                    <h3 className="type-card-title mt-2 text-xl text-white">{module.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-zinc-300">{module.description}</p>
                    <div className="mt-5 flex items-center gap-3"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]"><span className="block h-full rounded-full bg-cyan-200/70" style={{ width: `${progress.percent}%` }} /></div><span className="text-[0.68rem] text-zinc-300">{statusLabel(progress.completed === progress.total ? "completed" : progress.completed > 0 ? "in_progress" : undefined)}</span><ChevronRight className="size-4 text-zinc-400 transition group-hover:translate-x-1 group-hover:text-cyan-100" aria-hidden="true" /></div>
                    <p className="mt-4 text-[0.68rem] uppercase tracking-[0.12em] text-amber-100/60">Artifact · {module.artifactLabel}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <div className="mb-4"><p className="type-label text-xs uppercase text-cyan-100/75">Study loop</p><h2 className="type-card-title mt-3 text-2xl text-white">Turn a lesson into a practice artifact.</h2></div>
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            ["Labs", "Make the arithmetic visible before you trust the story.", "/app/learn/labs", FlaskConical],
            ["Playbook", "Write boundaries, rules, sizing, and governance.", "/app/playbook", Target],
            ["Journal + review", "Capture observations, behavior, and evidence quality.", "/app/journal", BookOpenCheck],
          ].map(([label, body, href, Icon]) => <Link key={label as string} href={href as string} className="glass-surface group rounded-[1.05rem] p-5 transition hover:bg-[#0c1415]"><div className="flex items-start justify-between gap-4"><span className="grid size-9 place-items-center rounded-[0.75rem] bg-cyan-200/[0.055] text-cyan-100"><Icon className="size-4" aria-hidden="true" /></span><ArrowRight className="size-4 text-zinc-400 transition group-hover:translate-x-1 group-hover:text-cyan-100" aria-hidden="true" /></div><p className="mt-6 text-xs uppercase tracking-[0.14em] text-cyan-100/65">{label as string}</p><p className="mt-2 text-sm leading-6 text-zinc-300">{body as string}</p></Link>)}
        </div>
      </section>
    </div>
  );
}

export function EducationModulePage({ module }: { module: LearningModule }) {
  const { state, hydrated } = useEducationState();
  const progress = moduleProgress(module, state.progress);
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-zinc-300"><Link href="/app/learn" className="hover:text-cyan-100">Learn</Link><ChevronRight className="size-3" aria-hidden="true" /><span>Module {module.number}</span></div>
      <section className="section-shell rounded-[1.25rem] p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"><div className="max-w-3xl"><div className="flex items-center gap-4"><ModuleGlyph module={module} large /><p className="text-xs uppercase tracking-[0.16em] text-cyan-100/75">Module {module.number}</p></div><h1 className="type-display mt-6 text-4xl text-white sm:text-5xl">{module.title}</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400">{module.description}</p></div><div className="glass-surface rounded-[1rem] p-5 lg:w-64"><p className="text-xs uppercase tracking-[0.14em] text-zinc-300">Mastery</p><p className="mt-3 font-mono text-2xl text-white">{progress.completed}/{progress.total}</p><p className="mt-2 text-xs text-zinc-300">{hydrated ? "Progress saved locally" : "Loading progress"}</p><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.06]"><span className="block h-full rounded-full bg-cyan-200/70" style={{ width: `${progress.percent}%` }} /></div></div></div>
        <div className="mt-8 grid gap-3 border-t border-white/[0.06] pt-6 sm:grid-cols-2 lg:grid-cols-4">{module.topics.map((topic) => <div key={topic} className="rounded-[0.85rem] bg-black/20 p-3 text-xs text-zinc-400"><span className="mr-2 text-cyan-100/70">·</span>{topic}</div>)}</div>
      </section>
      <SafeBoundary />
      <section className="space-y-3">
        {module.lessons.map((lesson, index) => { const lessonState = currentLessonProgress(lesson, state.progress); return <Link key={lesson.id} href={`/app/learn/${module.slug}/${lesson.slug}`} className="glass-surface group flex flex-col gap-4 rounded-[1.05rem] p-5 transition hover:bg-[#0c1415] sm:flex-row sm:items-center"><span className="font-mono text-xs text-zinc-300">0{index + 1}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-3"><h2 className="text-lg text-white">{lesson.title}</h2><span className={`rounded-full border px-2 py-1 text-[0.62rem] uppercase tracking-[0.1em] ${lessonState?.status === "completed" ? "border-emerald-200/15 bg-emerald-200/[0.04] text-emerald-100/80" : "border-white/10 bg-white/[0.02] text-zinc-300"}`}>{statusLabel(lessonState?.status)}</span></div><p className="mt-2 text-sm leading-6 text-zinc-300">{lesson.objective}</p></div><span className="flex items-center gap-2 text-xs text-zinc-300"><Clock3 className="size-3.5" aria-hidden="true" />{lesson.estimatedMinutes} min<ArrowRight className="ml-2 size-4 transition group-hover:translate-x-1 group-hover:text-cyan-100" aria-hidden="true" /></span></Link>; })}
      </section>
      <section className="glass-surface flex flex-col gap-4 rounded-[1.05rem] p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs uppercase tracking-[0.14em] text-zinc-300">Practical artifact</p><p className="mt-2 text-sm text-white">{module.artifactLabel}</p><p className="mt-1 text-xs text-zinc-300">Finish the module by making one decision or boundary explicit.</p></div><Link href={getArtifactHref(module.artifactType)} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-cyan-200/20 bg-cyan-200/[0.04] px-3 text-sm text-cyan-100 transition hover:bg-cyan-200/[0.1]">Open artifact<ArrowRight className="size-4" aria-hidden="true" /></Link></section>
    </div>
  );
}

function LessonNavigation({ module, lesson }: { module: LearningModule; lesson: Lesson }) {
  const index = module.lessons.findIndex((item) => item.id === lesson.id);
  const previous = index > 0 ? module.lessons[index - 1] : null;
  const next = index < module.lessons.length - 1 ? module.lessons[index + 1] : null;
  return <div className="flex flex-col gap-3 border-t border-white/[0.06] pt-5 sm:flex-row sm:items-center sm:justify-between"><div>{previous ? <Link href={`/app/learn/${module.slug}/${previous.slug}`} className="inline-flex items-center gap-2 text-xs text-zinc-300 hover:text-cyan-100"><ChevronLeft className="size-3.5" />Previous lesson</Link> : <Link href={`/app/learn/${module.slug}`} className="inline-flex items-center gap-2 text-xs text-zinc-300 hover:text-cyan-100"><ChevronLeft className="size-3.5" />Module overview</Link>}</div><div>{next ? <Link href={`/app/learn/${module.slug}/${next.slug}`} className="inline-flex items-center gap-2 text-xs text-cyan-100 hover:text-white">Next lesson<ChevronRight className="size-3.5" /></Link> : <Link href={getArtifactHref(module.artifactType)} className="inline-flex items-center gap-2 text-xs text-cyan-100 hover:text-white">Open {module.artifactLabel}<ArrowRight className="size-3.5" /></Link>}</div></div>;
}

export function EducationLessonPage({ module, lesson }: { module: LearningModule; lesson: Lesson }) {
  const searchParams = useSearchParams();
  const { state, updateState, hydrated } = useEducationState();
  const storedProgress = currentLessonProgress(lesson, state.progress);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [exerciseAnswer, setExerciseAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [exerciseSubmitted, setExerciseSubmitted] = useState(false);
  const [studyNote, setStudyNote] = useState("");
  const [saved, setSaved] = useState(false);
  const score = lesson.quiz.reduce((total, question) => total + (answers[question.id] === question.answer ? 1 : 0), 0);
  const scorePercent = lesson.quiz.length ? Math.round((score / lesson.quiz.length) * 100) : 0;
  const exerciseCorrect = exerciseAnswer === lesson.exercise.answer;
  const lessonComplete = submitted && exerciseSubmitted && exerciseCorrect && scorePercent >= 67;
  const artifactHref = getArtifactHref(module.artifactType);
  const monitorMarket = searchParams.get("market");
  const monitorState = searchParams.get("state");
  const monitorTimeframe = searchParams.get("timeframe");
  const monitorFlipLevel = searchParams.get("flipLevel");
  const monitorCapturedAt = searchParams.get("capturedAt");
  const journalHref = monitorMarket
    ? `/app/journal?market=${encodeURIComponent(monitorMarket)}&state=${encodeURIComponent(monitorState ?? "descriptive")}&timeframe=${encodeURIComponent(monitorTimeframe ?? "selected")}&flipLevel=${encodeURIComponent(monitorFlipLevel ?? "not-supplied")}&capturedAt=${encodeURIComponent(monitorCapturedAt ?? "not-supplied")}`
    : "/app/journal";

  function markProgress(status: "in_progress" | "completed", quizScore?: number, countAttempt = true) {
    updateState((current) => ({
      ...current,
      progress: {
        ...current.progress,
        [lesson.id]: {
          lessonId: lesson.id,
          contentVersion: lesson.contentVersion,
          status,
          quizScore,
          attempts: (currentLessonProgress(lesson, current.progress)?.attempts ?? 0) + (countAttempt ? 1 : 0),
          completedAt: status === "completed" ? new Date().toISOString() : current.progress[lesson.id]?.completedAt,
        },
      },
    }));
  }

  function submitQuiz(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    const completeAfterSubmit = exerciseSubmitted && exerciseCorrect && scorePercent >= 67;
    markProgress(completeAfterSubmit ? "completed" : "in_progress", scorePercent);
  }

  function saveStudyNote() {
    if (!studyNote.trim()) return;
    updateState((current) => ({ ...current, artifacts: [{ id: `note-${Date.now()}`, type: "study-note", title: `${lesson.title} study note`, body: studyNote.trim(), createdAt: new Date().toISOString() }, ...current.artifacts] }));
    setStudyNote("");
    setSaved(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-300"><Link href="/app/learn" className="hover:text-cyan-100">Learn</Link><ChevronRight className="size-3" aria-hidden="true" /><Link href={`/app/learn/${module.slug}`} className="hover:text-cyan-100">Module {module.number}</Link><ChevronRight className="size-3" aria-hidden="true" /><span>{lesson.title}</span></div>
      <section className="section-shell rounded-[1.25rem] p-6 sm:p-8"><div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.15em] text-cyan-100/75"><span className="font-mono">Module {module.number}</span><span className="text-zinc-400">/</span><span className="inline-flex items-center gap-2"><Clock3 className="size-3.5" aria-hidden="true" />{lesson.estimatedMinutes} min</span><span className="text-zinc-400">/</span><span>Content v{lesson.contentVersion}</span></div><h1 className="type-display mt-6 max-w-4xl text-4xl text-white sm:text-6xl">{lesson.title}</h1><p className="mt-5 max-w-3xl text-sm leading-6 text-zinc-300/80"><span className="mr-2 font-medium text-cyan-100">Objective</span>{lesson.objective}</p></section>
      <SafeBoundary />
      {monitorMarket ? <section className="rounded-[1.05rem] border border-cyan-200/15 bg-cyan-200/[0.035] p-5 sm:p-6"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-xs uppercase tracking-[0.14em] text-cyan-100/70">Market monitor context attached</p><h2 className="mt-2 text-xl text-white">{monitorMarket}</h2><p className="mt-2 text-sm leading-6 text-zinc-400">The Market Monitor recorded a <span className="text-cyan-100">{monitorState ?? "descriptive"}</span> state on the <span className="font-mono text-zinc-300">{monitorTimeframe ?? "selected"}</span> timeframe. Treat this as a provider snapshot to annotate, not as a trade instruction.</p></div><div className="grid grid-cols-2 gap-3 text-xs lg:min-w-56"><div className="rounded-[0.75rem] bg-black/20 p-3"><p className="text-zinc-300">Flip level</p><p className="mt-2 font-mono text-zinc-200">{monitorFlipLevel ?? "Not supplied"}</p></div><div className="rounded-[0.75rem] bg-black/20 p-3"><p className="text-zinc-300">Captured</p><p className="mt-2 font-mono text-zinc-200">{monitorCapturedAt ? new Date(monitorCapturedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "Not supplied"}</p></div></div></div><Link href={journalHref} className="mt-4 inline-flex items-center gap-2 text-xs text-cyan-100 hover:text-white">Save as an annotated observation<ArrowRight className="size-3.5" aria-hidden="true" /></Link></section> : null}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <article className="space-y-4">
          {lesson.sections.map((section) => <section key={section.heading} className="glass-surface rounded-[1.05rem] p-5 sm:p-6"><div className="flex items-center justify-between gap-4"><h2 className="type-card-title text-xl text-white">{section.heading}</h2><span className={`rounded-full border px-2 py-1 text-xs uppercase tracking-[0.08em] ${section.evidenceType === "fact" ? "border-cyan-200/20 text-cyan-50/90" : section.evidenceType === "rule" ? "border-amber-200/20 text-amber-50/90" : "border-white/15 text-zinc-300"}`}>{section.evidenceType}</span></div><p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">{section.body}</p>{section.sourceLabels?.length ? <p className="mt-4 border-t border-white/[0.08] pt-3 text-xs leading-5 text-zinc-300">Direct support: {section.sourceLabels.join(" · ")}</p> : null}</section>)}
          <section className="rounded-[1.05rem] border border-amber-200/15 bg-amber-200/[0.035] p-5 sm:p-6"><p className="text-xs uppercase tracking-[0.14em] text-amber-100/70">Worked example</p><p className="mt-4 text-sm leading-7 text-amber-50/80">{lesson.workedExample}</p></section>
        </article>
        <aside className="space-y-4">
          <div className="glass-surface rounded-[1.05rem] p-5"><p className="text-xs uppercase tracking-[0.14em] text-zinc-300">Common mistakes</p><ul className="mt-4 space-y-3">{lesson.commonMistakes.map((mistake) => <li key={mistake} className="flex items-start gap-2 text-sm leading-6 text-zinc-400"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-rose-200/70" />{mistake}</li>)}</ul></div>
          <div className="glass-surface rounded-[1.05rem] p-5"><p className="text-xs uppercase tracking-[0.14em] text-zinc-300">Next action</p><p className="mt-4 text-sm leading-6 text-zinc-300">{lesson.nextAction}</p><Link href={artifactHref} className="mt-5 inline-flex items-center gap-2 text-xs text-cyan-100 hover:text-white">Open {module.artifactLabel}<ArrowRight className="size-3.5" /></Link></div>
        </aside>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="glass-surface rounded-[1.05rem] p-5 sm:p-6"><div className="flex items-center gap-3"><Sparkles className="size-4 text-cyan-100" aria-hidden="true" /><h2 className="type-card-title text-xl text-white">Interactive exercise</h2></div><p className="mt-4 text-sm leading-6 text-zinc-400">{lesson.exercise.prompt}</p><div className="mt-4 space-y-2">{lesson.exercise.options.map((option) => <button key={option} type="button" aria-pressed={exerciseAnswer === option} onClick={() => { setExerciseAnswer(option); setExerciseSubmitted(false); }} className={`flex w-full items-start gap-3 rounded-[0.8rem] border p-3 text-left text-sm transition ${exerciseAnswer === option ? "border-cyan-200/30 bg-cyan-200/[0.08] text-cyan-50" : "border-white/[0.08] bg-white/[0.02] text-zinc-400 hover:bg-white/[0.05]"}`}><span className={`mt-0.5 grid size-4 place-items-center rounded-full border text-[0.6rem] ${exerciseAnswer === option ? "border-cyan-100 bg-cyan-100 text-[#071012]" : "border-white/20 text-transparent"}`}><Check className="size-3" /></span>{option}</button>)}</div><Button type="button" variant="outline" className="mt-4" disabled={!exerciseAnswer || !hydrated} onClick={() => { setExerciseSubmitted(true); const completeAfterExercise = submitted && scorePercent >= 67 && exerciseCorrect; markProgress(completeAfterExercise ? "completed" : "in_progress", submitted ? scorePercent : undefined, false); }}>{exerciseSubmitted ? "Exercise checked" : "Check exercise"}</Button>{exerciseSubmitted ? <p className={`mt-3 rounded-[0.75rem] p-3 text-xs leading-5 ${exerciseCorrect ? "bg-emerald-200/[0.05] text-emerald-50/80" : "bg-amber-200/[0.05] text-amber-50/85"}`}>{exerciseCorrect ? "Correct. " : "Not quite. "}{lesson.exercise.explanation}</p> : null}</div>
        <form onSubmit={submitQuiz} className="glass-surface rounded-[1.05rem] p-5 sm:p-6"><div className="flex items-center gap-3"><BookOpenCheck className="size-4 text-cyan-100" aria-hidden="true" /><h2 className="type-card-title text-xl text-white">Objective quiz</h2></div><div className="mt-5 space-y-6">{lesson.quiz.map((question, index) => <fieldset key={question.id}><legend className="text-sm leading-6 text-zinc-300"><span className="mr-2 font-mono text-xs text-zinc-300">0{index + 1}</span>{question.prompt}</legend><div className="mt-3 space-y-2">{question.options.map((option) => <label key={option} className={`flex cursor-pointer items-start gap-3 rounded-[0.75rem] border p-3 text-sm transition ${answers[question.id] === option ? "border-cyan-200/25 bg-cyan-200/[0.06] text-cyan-50" : "border-white/[0.08] bg-white/[0.02] text-zinc-300 hover:bg-white/[0.05]"}`}><input type="radio" name={question.id} value={option} checked={answers[question.id] === option} onChange={() => { setAnswers((current) => ({ ...current, [question.id]: option })); setSubmitted(false); }} className="mt-1 accent-cyan-200" />{option}</label>)}</div>{submitted ? <p className="mt-3 text-xs leading-5 text-zinc-300">{answers[question.id] === question.answer ? "Correct. " : "Review. "}{question.explanation}</p> : null}</fieldset>)}</div><div className="mt-6 flex flex-wrap items-center gap-3"><Button type="submit" disabled={!hydrated || Object.keys(answers).length !== lesson.quiz.length}>Check quiz</Button>{submitted ? <span className={`text-xs ${lessonComplete ? "text-emerald-100" : "text-amber-100"}`}>{score}/{lesson.quiz.length} · {scorePercent}%{lessonComplete ? " · lesson complete" : scorePercent < 67 ? " · reach 67% to finish" : !exerciseSubmitted ? " · check the exercise to finish" : " · answer the exercise correctly to finish"}</span> : null}</div>{storedProgress?.attempts ? <p className="mt-4 text-[0.68rem] text-zinc-300">Quiz attempts recorded: {storedProgress.attempts} · Retries remain reviewable.</p> : null}</form>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
        <div className="glass-surface rounded-[1.05rem] p-5 sm:p-6"><div className="flex items-center justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.14em] text-zinc-300">Save a practical note</p><p className="mt-2 text-sm text-zinc-300">What will you look for differently in the market monitor or your next review?</p></div><Target className="size-4 text-amber-100/70" aria-hidden="true" /></div><textarea value={studyNote} onChange={(event) => setStudyNote(event.target.value)} rows={4} maxLength={800} placeholder="Write one observation, assumption, or process rule..." className="mt-4 w-full resize-y rounded-[0.8rem] border border-white/10 bg-black/20 p-3 text-sm leading-6 text-white outline-none placeholder:text-zinc-400 focus:border-cyan-200/30" /><div className="mt-3 flex items-center justify-between gap-3"><span className="text-[0.68rem] text-zinc-300">{studyNote.length}/800</span><Button type="button" variant="outline" onClick={saveStudyNote} disabled={!hydrated || !studyNote.trim()}>Save note</Button></div>{saved ? <p className="mt-3 text-xs text-emerald-100/80">Study note saved to your local artifact record.</p> : null}</div>
        <div className="glass-surface rounded-[1.05rem] p-5 sm:p-6"><p className="text-xs uppercase tracking-[0.12em] text-zinc-300">Further reading & review</p><div className="mt-4 space-y-3">{lesson.sources.map((source) => <a key={source.href} href={source.href} target="_blank" rel="noreferrer" className="flex items-start gap-2 text-sm leading-5 text-cyan-100/85 hover:text-white"><ExternalLink className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /><span>{source.label}{source.scope ? <span className="mt-1 block text-xs text-zinc-300">{source.scope}</span> : null}</span></a>)}</div><p className="mt-5 border-t border-white/[0.08] pt-4 text-xs leading-5 text-zinc-300">Content reviewed {lesson.lastReviewedAt}. These references provide background reading; authored practice rules and examples are labeled separately and are not attributed to a source unless a section says “Direct support.” Confirm current rules and data before relying on them.</p></div>
      </section>
      <LessonNavigation module={module} lesson={lesson} />
    </div>
  );
}
