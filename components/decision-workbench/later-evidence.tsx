"use client"

import { cn } from "@/lib/utils"
import { CheckCircle2, Clock } from "lucide-react"
import { useState } from "react"

export function LaterEvidence({ data }: { data: any }) {
  const [showAllEvidence, setShowAllEvidence] = useState(false)
  const reviewEvidence = data.reviewEvidence || []
  const planVersusExecution = data.planVersusExecution
  const latestVisit = data.latestVisit

  const displayedEvidence = showAllEvidence ? reviewEvidence : reviewEvidence.slice(0, 3)

  return (
    <div className="space-y-4" data-testid="later-evidence">
      {/* Plan vs Execution (if exists) */}
      {planVersusExecution && (
        <section className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            Plan vs 实际执行对比
          </h3>
          <div className="space-y-3">
            <div>
              <h4 className="mb-1 text-xs font-medium text-muted-foreground">
                计划：
              </h4>
              <p className="text-sm leading-relaxed text-foreground">
                {planVersusExecution.plan}
              </p>
            </div>
            <div>
              <h4 className="mb-1 text-xs font-medium text-muted-foreground">
                实际：
              </h4>
              <p className="text-sm leading-relaxed text-foreground">
                {planVersusExecution.actual}
              </p>
            </div>
            {planVersusExecution.interpretation && (
              <p className="text-xs leading-relaxed text-muted-foreground">
                {planVersusExecution.interpretation}
              </p>
            )}
          </div>
        </section>
      )}

      {/* Evidence Timeline */}
      <section className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          后续证据时间线
        </h3>

        <div className="space-y-4">
          {displayedEvidence.map((evidence: any, index: number) => (
            <div
              key={evidence.key}
              className="relative border-l-2 border-primary/30 pl-4"
            >
              {/* Date Badge */}
              <div className="mb-2 flex items-center gap-2">
                <span className="font-mono text-xs font-medium text-muted-foreground">
                  {evidence.date}
                </span>
                {evidence.focusMembership && (
                  <span
                    className={cn(
                      "rounded-sm px-1.5 py-0.5 text-[10px] font-medium",
                      evidence.focusMembership === "selected_episode"
                        ? "bg-primary/10 text-primary"
                        : evidence.focusMembership === "context_only"
                        ? "bg-muted text-muted-foreground"
                        : "bg-accent text-accent-foreground",
                    )}
                  >
                    {evidence.focusMembership === "selected_episode"
                      ? "本 Episode"
                      : evidence.focusMembership === "context_only"
                      ? "仅上下文"
                      : "相关关注"}
                  </span>
                )}
              </div>

              {/* Title and Role */}
              <h4 className="mb-1 text-sm font-semibold text-foreground">
                {evidence.title}
              </h4>
              {evidence.role && (
                <p className="mb-2 text-xs text-muted-foreground">
                  {evidence.role.replace(/_/g, " ")}
                </p>
              )}

              {/* Detail */}
              <p className="mb-2 text-sm leading-relaxed text-foreground">
                {evidence.detail}
              </p>

              {/* Source */}
              {evidence.source && (
                <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {evidence.source.displayLabel}
                </span>
              )}

              {/* Immediate/Delayed Response */}
              {evidence.immediateResponse && (
                <div className="mt-2 rounded-md bg-muted/50 p-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    即时反应：
                  </p>
                  <p className="text-xs leading-relaxed text-foreground">
                    {evidence.immediateResponse}
                  </p>
                </div>
              )}

              {evidence.delayedResponse === null &&
                evidence.reasoningRestated === false && (
                  <div className="mt-2 flex items-start gap-1.5 text-xs text-event-unresolved">
                    <Clock className="mt-0.5 size-3 shrink-0" />
                    <span>延迟反应待补充，推理未重述</span>
                  </div>
                )}

              {/* Missing Info */}
              {evidence.missing && (
                <div className="mt-2 text-xs text-event-unresolved">
                  缺失：{evidence.missing}
                </div>
              )}

              {/* Cautions */}
              {evidence.cautions && evidence.cautions.length > 0 && (
                <div className="mt-2 space-y-1">
                  {evidence.cautions.map((caution: string, idx: number) => (
                    <p key={idx} className="text-xs leading-relaxed text-muted-foreground">
                      ⚠️ {caution}
                    </p>
                  ))}
                </div>
              )}

              {/* Timeline Node */}
              <div className="absolute -left-[5px] top-0 size-2 rounded-full bg-primary ring-2 ring-background" />
            </div>
          ))}
        </div>

        {/* Show More Button */}
        {reviewEvidence.length > 3 && (
          <button
            type="button"
            onClick={() => setShowAllEvidence(!showAllEvidence)}
            className="mt-4 w-full rounded-md border border-dashed border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            {showAllEvidence
              ? "收起"
              : `显示其余 ${reviewEvidence.length - 3} 条证据`}
          </button>
        )}
      </section>

      {/* Latest Visit Details */}
      {latestVisit && (
        <section className="rounded-lg border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              最近 Visit 详情
            </h3>
            <span className="font-mono text-xs text-muted-foreground">
              {latestVisit.date}
            </span>
          </div>

          {/* Selected Focus Steps */}
          {latestVisit.selectedFocusSteps &&
            latestVisit.selectedFocusSteps.length > 0 && (
              <div className="mb-3">
                <h4 className="mb-2 text-xs font-medium text-muted-foreground">
                  本 Focus 的步骤：
                </h4>
                <ul className="space-y-1">
                  {latestVisit.selectedFocusSteps.map(
                    (step: string, idx: number) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-sm text-foreground"
                      >
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                        {step}
                      </li>
                    ),
                  )}
                </ul>
              </div>
            )}

          {/* Visit Context Steps (Collapsible) */}
          {latestVisit.visitContextSteps &&
            latestVisit.visitContextSteps.length > 0 && (
              <details className="group">
                <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
                  查看同 Visit 其他步骤 ({latestVisit.visitContextSteps.length})
                </summary>
                <ul className="mt-2 space-y-1 pl-4">
                  {latestVisit.visitContextSteps.map(
                    (step: string, idx: number) => (
                      <li
                        key={idx}
                        className="text-sm text-muted-foreground opacity-75"
                      >
                        {step}
                      </li>
                    ),
                  )}
                </ul>
              </details>
            )}

          {/* Source and Reasoning Status */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {latestVisit.source && (
              <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {latestVisit.source.displayLabel}
              </span>
            )}
            {latestVisit.assessmentRestated === false && (
              <span className="text-xs text-event-unresolved">
                Assessment 未重述
              </span>
            )}
            {latestVisit.planRestated === false && (
              <span className="text-xs text-event-unresolved">Plan 未重述</span>
            )}
          </div>

          {latestVisit.membershipNote && (
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              {latestVisit.membershipNote}
            </p>
          )}
        </section>
      )}

      {/* Nearby Evidence Outside Episode */}
      {data.nearbyEvidenceOutsideEpisode &&
        data.nearbyEvidenceOutsideEpisode.length > 0 && (
          <section className="rounded-lg border border-dashed border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
              附近证据（Episode 外）
            </h3>
            <div className="space-y-3">
              {data.nearbyEvidenceOutsideEpisode.map(
                (evidence: any, index: number) => (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        {evidence.date}
                      </span>
                      <span className="text-sm font-medium text-foreground">
                        {evidence.title}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {evidence.detail}
                    </p>
                    {evidence.reason && (
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        原因：{evidence.reason}
                      </p>
                    )}
                  </div>
                ),
              )}
            </div>
          </section>
        )}
    </div>
  )
}
