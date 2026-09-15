import { notFound } from "next/navigation";

import { EducationModulePage } from "@/components/education-workspace";
import { getLearningModule } from "@/lib/education";

export const dynamic = "force-dynamic";

export default async function LearningModulePage({ params }: { params: Promise<{ moduleSlug: string }> }) {
  const { moduleSlug } = await params;
  const learningModule = getLearningModule(moduleSlug);
  if (!learningModule) notFound();
  return <EducationModulePage module={learningModule} />;
}
