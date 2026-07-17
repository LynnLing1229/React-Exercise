"use client"

import { useMemo, useRef, useState } from "react"
import {
  resolveFocus,
  type Focus,
  type PTReviewContext,
} from "@/src/features/pt-review/review-context"
import { BodyMapWorkspace } from "./body-map-workspace"
import { Panel } from "./ui"
import { SelectedEvidence } from "./selected-evidence"
import { StatusHeader } from "./status-header"
import { TopIssues } from "./top-issues"

export function PTReviewPage({ context }: { context: PTReviewContext }) {
  const firstScreenRef = useRef<HTMLDivElement>(null)
  const [focus, setFocus] = useState<Focus>(context.defaultFocusSuggestion)
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(
    context.defaultFocusSuggestion.kind === "issue"
      ? context.defaultFocusSuggestion.id
      : null,
  )
  const resolved = useMemo(() => resolveFocus(context, focus), [context, focus])

  function issueIdForMarker(markerId: string) {
    return (
      context.topBodyIssues.find((issue) =>
        issue.relatedMarkerIds.includes(markerId),
      )?.id ?? null
    )
  }

  function handleFocus(nextFocus: Focus) {
    setFocus(nextFocus)

    if (nextFocus.kind === "issue") {
      setExpandedIssueId(nextFocus.id)
      return
    }

    if (nextFocus.kind === "marker") {
      setExpandedIssueId(issueIdForMarker(nextFocus.id))
      return
    }

    setExpandedIssueId(null)
  }

  function handleIssueSelect(issueId: string) {
    const selectingDifferentIssue = resolved.issueId !== issueId
    setFocus({ kind: "issue", id: issueId })

    if (expandedIssueId === issueId) {
      setExpandedIssueId(null)
      return
    }

    setExpandedIssueId(issueId)
    if (selectingDifferentIssue) {
      requestAnimationFrame(() => alignFirstScreenWorkspace(firstScreenRef.current))
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <StatusHeader context={context} />

      <main
        className="mx-auto flex w-full max-w-[1440px] flex-col gap-3 p-3 md:p-4"
      >
        <div
          ref={firstScreenRef}
          className="grid gap-3 lg:h-[560px] lg:grid-cols-[330px_320px_minmax(0,1fr)] lg:items-stretch xl:grid-cols-[360px_360px_minmax(0,1fr)]"
          data-first-screen-grid
        >
          <Panel className="min-h-0 overflow-hidden">
            <TopIssues
              context={context}
              resolved={resolved}
              expandedIssueId={expandedIssueId}
              onIssueSelect={handleIssueSelect}
              onCollapse={() => setExpandedIssueId(null)}
            />
          </Panel>

          <Panel className="min-h-0 overflow-hidden">
            <BodyMapWorkspace context={context} resolved={resolved} onFocus={handleFocus} />
          </Panel>

          <Panel className="flex min-h-0 flex-col overflow-hidden">
            <SelectedEvidence resolved={resolved} />
          </Panel>
        </div>

        <footer className="border-t border-border pt-3 text-center text-[11px] leading-relaxed text-muted-foreground">
          {context.review.statusText}
        </footer>
      </main>
    </div>
  )
}

const DESKTOP_WORKSPACE_QUERY = "(min-width: 1024px)"
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)"
const WORKSPACE_TARGET_TOP = 16
const WORKSPACE_TOP_TOLERANCE = { minimum: 8, maximum: 64 }

function alignFirstScreenWorkspace(workspace: HTMLDivElement | null) {
  if (!workspace || !window.matchMedia(DESKTOP_WORKSPACE_QUERY).matches) return

  const rect = workspace.getBoundingClientRect()
  const visibleHeight = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0)
  const usefulHeight = Math.min(rect.height, window.innerHeight - WORKSPACE_TARGET_TOP * 2)
  const alreadyFramed =
    rect.top >= WORKSPACE_TOP_TOLERANCE.minimum &&
    rect.top <= WORKSPACE_TOP_TOLERANCE.maximum &&
    visibleHeight >= usefulHeight - 2
  if (alreadyFramed) return

  const targetTop = Math.max(0, window.scrollY + rect.top - WORKSPACE_TARGET_TOP)
  const distance = Math.abs(targetTop - window.scrollY)
  if (distance <= 2) return

  const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY).matches
  window.scrollTo({
    top: targetTop,
    behavior: !reducedMotion && distance <= 240 ? "smooth" : "auto",
  })
}
