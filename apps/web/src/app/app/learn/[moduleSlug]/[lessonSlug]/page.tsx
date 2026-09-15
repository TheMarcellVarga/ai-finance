import { notFound } from "next/navigation";

import { EducationLessonPage } from "@/components/education-workspace";
import { getLearningModule, getLesson } from "@/lib/education";

export const dynamic = "force-dynamic";

export default async function LearningLessonPage({ params }: { params: Promise<{ moduleSlug: string; lessonSlug: string }> }) {
  const { moduleSlug, lessonSlug } = await params;
  const learningModule = getLearningModule(moduleSlug);
  const lesson = getLesson(moduleSlug, lessonSlug);
  if (!learningModule || !lesson) notFound();
  return <EducationLessonPage module={learningModule} lesson={lesson} />;
}
