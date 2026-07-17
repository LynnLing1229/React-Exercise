"use client"

import { cn } from "@/lib/utils"
import { AlertCircle, Plus } from "lucide-react"

export function DecisionQuestion({ data }: { data: any }) {
  const nextDecision = data.nextDecision
  const reasoningFreshness = data.reasoningFreshness

  return (
    <section
      className="rounded-lg border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5 p-4 shadow-sm md:p-5"
      data-testid="decision-question"
    >
      {/* Why Now */}
      <div className="mb-3 flex items-start gap-2">
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-primary" />
        <p className="text-sm font-medium leading-relaxed text-foreground">
          {data.reviewFocus.whyNow}
        </p>
      </div>

      {/* Main Question */}
      <div className="mb-4 rounded-md border border-primary/20 bg-card/80 p-4">
        <h2 className="mb-2 text-base font-semibold text-foreground">
          {nextDecision.ownerFacingQuestion || nextDecision.ptFacingQuestion || nextDecision.question}
        </h2>
        {nextDecision.ptFacingQuestion && nextDecision.ownerFacingQuestion && (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">PT视角：</span>
            {nextDecision.ptFacingQuestion}
          </p>
        )}
      </div>

      {/* Reasoning Freshness Badge */}
      {reasoningFreshness && reasoningFreshness.state !== "review_point_unknown" && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">推理新鲜度：</span>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium",
              reasoningFreshness.state === "later_evidence_pending_pt_review"
                ? "border-event-unresolved/40 bg-event-unresolved-soft text-event-unresolved"
                : "border-border bg-muted text-muted-foreground",
            )}
          >
            {reasoningFreshness.display}
          </span>
          {reasoningFreshness.reviewedThrough && (
            <span className="text-xs text-muted-foreground">
              PT已复核至 <span className="font-mono font-medium">{reasoningFreshness.reviewedThrough}</span>
            </span>
          )}
        </div>
      )}

      {/* Action Button */}
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        data-testid="supplement-pt-reasoning"
      >
        <Plus className="size-4" />
        补充本次 PT 判断
      </button>

      {/* System Boundary Note */}
      {nextDecision.systemBoundary && (
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {nextDecision.systemBoundary}
        </p>
      )}
    </section>
  )
}
