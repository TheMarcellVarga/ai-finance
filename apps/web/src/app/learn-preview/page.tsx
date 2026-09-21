import { AppShell } from "@/components/app-shell";
import { EducationDashboard } from "@/components/education-workspace";
import { EducationStateProvider } from "@/lib/education-state";

export default function LearnPreviewPage() {
  return (
    <EducationStateProvider userId="visual-preview">
      <AppShell>
        <EducationDashboard />
      </AppShell>
    </EducationStateProvider>
  );
}
