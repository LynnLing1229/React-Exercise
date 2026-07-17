"use client"

import { useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { DecisionQuestion } from "./decision-question"
import { CurrentSynthesis } from "./current-synthesis"
import { LaterEvidence } from "./later-evidence"
import { FullHistory } from "./full-history"
import { FocusSelector } from "./focus-selector"
import { ChevronDown, ArrowLeft } from "lucide-react"

type WorkbenchState = "realReasoningGap" | "syntheticReasoningCaptured"

export function DecisionWorkbenchPage({ sampleData }: { sampleData: any }) {
  const [state, setState] = useState<WorkbenchState>("realReasoningGap")
  const [showLaterEvidence, setShowLaterEvidence] = useState(true)
  const [showFullHistory, setShowFullHistory] = useState(false)
  const [showFocusSelector, setShowFocusSelector] = useState(false)

  const data = sampleData[state]
  const scenario = data.scenario

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Back Navigation */}
      <div className="fixed left-4 top-4 z-50">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground shadow-lg transition-colors hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="size-3" />
          返回第一屏
        </Link>
      </div>

      {/* Header with Focus and State Switch */}
      <header className="sticky top-0 z-20 flex flex-col gap-2 border-b border-border bg-card px-4 py-3 shadow-sm md:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          {/* Focus Info */}
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <button
              type="button"
              onClick={() => setShowFocusSelector(!showFocusSelector)}
              className="group flex min-w-0 flex-1 items-center gap-2 rounded-md border border-border bg-background px-3 py-2 transition-colors hover:border-primary/40 hover:bg-accent/25 lg:max-w-md"
              data-testid="focus-selector-trigger"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
                关注
              </span>
              <div className="min-w-0 flex-1 text-left">
                <div className="truncate text-sm font-semibold text-foreground">
                  {data.reviewFocus.label}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {data.careEpisode.label}
                </div>
              </div>
              <ChevronDown
                className={cn(
                  "size-4 shrink-0 text-muted-foreground transition-transform group-hover:text-foreground",
                  showFocusSelector && "rotate-180",
                )}
              />
            </button>

            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium",
                  data.careEpisode.lifecycle === "open"
                    ? "border-event-pt-visit/30 bg-event-pt-visit-soft text-event-pt-visit"
                    : "border-border bg-muted text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    data.careEpisode.lifecycle === "open"
                      ? "bg-event-pt-visit"
                      : "bg-muted-foreground",
                  )}
                  aria-hidden
                />
                {data.careEpisode.displayLifecycle || "Open"}
              </span>
            </div>
          </div>

          {/* Prototype State Switch */}
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden text-xs text-muted-foreground lg:inline">
              [Prototype]
            </span>
            <div className="flex gap-1 rounded-md bg-muted p-0.5">
              <button
                type="button"
                onClick={() => setState("realReasoningGap")}
                className={cn(
                  "rounded-[5px] px-3 py-1.5 text-xs font-medium leading-none transition-colors",
                  state === "realReasoningGap"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
                data-testid="state-real"
              >
                真实状态
              </button>
              <button
                type="button"
                onClick={() => setState("syntheticReasoningCaptured")}
                className={cn(
                  "rounded-[5px] px-3 py-1.5 text-xs font-medium leading-none transition-colors",
                  state === "syntheticReasoningCaptured"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
                data-testid="state-synthetic"
              >
                合成状态
              </button>
            </div>
          </div>
        </div>

        {/* Prototype Warning for Synthetic State */}
        {state === "syntheticReasoningCaptured" && scenario.visibleWarning && (
          <div className="rounded-md border border-event-unresolved/30 bg-event-unresolved-soft px-3 py-2 text-xs text-event-unresolved">
            <span className="font-semibold">设计示例：</span> {scenario.visibleWarning}
          </div>
        )}
      </header>

      {/* Focus Selector Dropdown */}
      {showFocusSelector && (
        <FocusSelector
          currentFocus={data.reviewFocus}
          onClose={() => setShowFocusSelector(false)}
        />
      )}

      {/* Main Content */}
      <main className="mx-auto w-full max-w-[1440px] space-y-4 p-3 md:p-4">
        {/* Decision Question - Top Priority */}
        <DecisionQuestion data={data} />

        {/* Current Synthesis - Two Column Compare */}
        <CurrentSynthesis data={data} />

        {/* Later Evidence - Expandable Timeline */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setShowLaterEvidence(!showLaterEvidence)}
            className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-accent/25"
            data-testid="toggle-later-evidence"
          >
            <h2 className="text-sm font-semibold text-foreground">之后发生了什么</h2>
            <ChevronDown
              className={cn(
                "size-4 text-muted-foreground transition-transform",
                showLaterEvidence && "rotate-180",
              )}
            />
          </button>
          {showLaterEvidence && <LaterEvidence data={data} />}
        </div>

        {/* Full History - Expandable */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setShowFullHistory(!showFullHistory)}
            className="flex w-full items-center justify-between rounded-lg border border-dashed border-border bg-card px-4 py-3 text-left transition-colors hover:bg-accent/25"
            data-testid="toggle-full-history"
          >
            <h2 className="text-sm font-semibold text-muted-foreground">
              完整历史与来源
            </h2>
            <ChevronDown
              className={cn(
                "size-4 text-muted-foreground transition-transform",
                showFullHistory && "rotate-180",
              )}
            />
          </button>
          {showFullHistory && <FullHistory data={data} />}
        </div>
      </main>

      {/* Mobile FAB for Focus Selector */}
      <button
        type="button"
        onClick={() => setShowFocusSelector(!showFocusSelector)}
        className="fixed bottom-6 right-6 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95 lg:hidden"
        data-testid="focus-selector-fab"
        aria-label="切换关注焦点"
      >
        <span className="text-xs font-bold">关注</span>
      </button>
    </div>
  )
}
