import { Button } from "@/components/ui/button";

type AiActionPanelProps = { title: string };

export function AiActionPanel({ title }: AiActionPanelProps) {
  return <section className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 py-5">
    <div><h2 className="text-base font-medium text-white">{title}</h2><p id="research-actions-unavailable" className="mt-2 text-sm text-zinc-400">Generation and saved reports are unavailable in this preview.</p></div>
    <Button disabled variant="outline" aria-describedby="research-actions-unavailable">Research actions unavailable</Button>
  </section>;
}
