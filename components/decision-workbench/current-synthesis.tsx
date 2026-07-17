"use client"

import { cn } from "@/lib/utils"
import { AlertTriangle, Calendar, FileText } from "lucide-react"

function ProvenanceBadge({ source }: { source: any }) {
  if (!source || !source.displayLabel) return null

  const colors = {
    "PT 已确认": "border-event-outcome/30 bg-event-outcome-soft text-event-outcome",
    default: "border-border bg-muted text-muted-foreground",
  }

  const colorClass = source.displayLabel.includes("PT 已确认")
    ? colors["PT 已确认"]
    : colors.default

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium",
        colorClass,
      )}
      title={`来源: ${source.origin}\n表述: ${source.representation}\n复核: ${source.review}`}
    >
      {source.displayLabel}
    </span>
  )
}

function MissingPlaceholder({
  label,
  description,
}: {
  label: string
  description?: string
}) {
  return (
    <div className="rounded-md border border-dashed border-border bg-muted/30 p-3">
      <div className="mb-2 flex items-center gap-2">
        <AlertTriangle className="size-4 text-event-unresolved" />
        <span className="text-sm font-semibold text-muted-foreground">
          {label}
        </span>
      </div>
      {description && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      <button
        type="button"
        className="mt-2 text-xs font-medium text-primary hover:underline"
      >
        点击补充
      </button>
    </div>
  )
}

export function CurrentSynthesis({ data }: { data: any }) {
  const ptView = data.mostRecentlyRecordedPtView
  const plan = data.mostRecentlyRecordedPlan
  const decisionCondition = data.decisionCondition
  const presentation = data.currentPresentation
  const goal = data.goal
  const reasoningFreshness = data.reasoningFreshness

  return (
    <section className="rounded-lg border border-border bg-card" data-testid="current-synthesis">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">当前决策综合</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          最近记录的 PT 推理 vs 当前状态与变化
        </p>
      </div>

      <div className="grid gap-6 p-4 lg:grid-cols-2 lg:gap-8">
        {/* Left Column: Most Recently Recorded PT Reasoning */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            最近记录的 PT 推理
          </h3>

          {/* PT View */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-muted-foreground" />
              <h4 className="text-sm font-semibold text-foreground">PT Assessment</h4>
            </div>

            {ptView.state === "not_captured" ? (
              <MissingPlaceholder
                label="PT Assessment 未捕获"
                description={ptView.warning || ptView.display}
              />
            ) : (
              <div className="space-y-2 rounded-md border border-border bg-background p-3">
                <div className="flex flex-wrap items-center gap-2">
                  {ptView.effectiveDate && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="size-3" />
                      {ptView.effectiveDate}
                    </span>
                  )}
                  {ptView.source && <ProvenanceBadge source={ptView.source} />}
                </div>
                <p className="text-sm leading-relaxed text-foreground">
                  {ptView.summary}
                </p>
                {ptView.source?.reference && (
                  <p className="text-xs text-muted-foreground">
                    {ptView.source.reference}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Plan */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">Plan</h4>

            {plan.state === "not_captured" ? (
              <MissingPlaceholder
                label="Plan 及其目的未捕获"
                description={plan.display}
              />
            ) : (
              <div className="space-y-2 rounded-md border border-border bg-background p-3">
                <div className="flex flex-wrap items-center gap-2">
                  {plan.effectiveDate && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="size-3" />
                      {plan.effectiveDate}
                    </span>
                  )}
                  {plan.sourceLabel && (
                    <span className="text-xs text-muted-foreground">
                      {plan.sourceLabel}
                    </span>
                  )}
                </div>
                <p className="text-sm leading-relaxed text-foreground">
                  {plan.summary}
                </p>
                {plan.applicability && (
                  <p className="text-xs text-muted-foreground">
                    适用性：{plan.applicability}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Decision Condition */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">Decision Condition</h4>

            {decisionCondition.state === "not_captured" ? (
              <MissingPlaceholder
                label="判断条件未记录"
                description={decisionCondition.display}
              />
            ) : (
              <div className="space-y-2 rounded-md border border-border bg-background p-3">
                <p className="text-sm leading-relaxed text-foreground">
                  {decisionCondition.naturalLanguage}
                </p>
                {decisionCondition.possibleLaterEvidence && (
                  <p className="text-xs text-muted-foreground">
                    {decisionCondition.possibleLaterEvidence}
                  </p>
                )}
                {decisionCondition.systemBoundary && (
                  <p className="text-xs text-muted-foreground">
                    {decisionCondition.systemBoundary}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Current State & Changes */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            当前状态与重要变化
          </h3>

          {/* Current Presentation */}
          {presentation && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground">当前 Presentation</h4>
              <div className="rounded-md border border-border bg-background p-3">
                {presentation.recordedThrough && (
                  <div className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="size-3" />
                    记录至 {presentation.recordedThrough}
                  </div>
                )}
                <p className="mb-2 text-sm leading-relaxed text-foreground">
                  {presentation.summary}
                </p>
                {presentation.latestKnownState && (
                  <p className="text-xs text-muted-foreground">
                    {presentation.latestKnownState}
                  </p>
                )}
                {presentation.source && (
                  <div className="mt-2">
                    <ProvenanceBadge source={presentation.source} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Goal */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">Goal</h4>
            {goal.state === "not_captured" ? (
              <div className="rounded-md border border-dashed border-border bg-muted/30 p-3">
                <p className="text-sm text-muted-foreground">{goal.display}</p>
              </div>
            ) : (
              <div className="rounded-md border border-border bg-background p-3">
                <p className="mb-2 text-sm font-medium leading-relaxed text-foreground">
                  {goal.label}
                </p>
                {goal.progress && (
                  <span className="inline-flex items-center rounded-md border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {goal.progress}
                  </span>
                )}
                {goal.provenance && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {goal.provenance}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Later Evidence Summary */}
          {reasoningFreshness && reasoningFreshness.laterEvidenceDates && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground">后续证据概要</h4>
              <div className="rounded-md border border-event-unresolved/30 bg-event-unresolved-soft p-3">
                <p className="mb-2 text-sm font-medium text-event-unresolved">
                  有 {reasoningFreshness.laterEvidenceDates.length} 天的新证据尚待 PT 复核
                </p>
                <div className="flex flex-wrap gap-1">
                  {reasoningFreshness.laterEvidenceDates.map((date: string) => (
                    <span
                      key={date}
                      className="font-mono text-xs text-event-unresolved"
                    >
                      {date.slice(5)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
