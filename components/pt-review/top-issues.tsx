"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { CalendarDays, ChevronDown, ChevronUp, Dumbbell } from "lucide-react"
import {
  type BodyIssue,
  type PTReviewContext,
  type ResolvedFocus,
} from "@/src/features/pt-review/review-context"
import { SectionTitle } from "./ui"

export function TopIssues({
  context,
  resolved,
  expandedIssueId,
  onIssueSelect,
  onCollapse,
}: {
  context: PTReviewContext
  resolved: ResolvedFocus
  expandedIssueId: string | null
  onIssueSelect: (issueId: string) => void
  onCollapse: () => void
}) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3" onClick={onCollapse}>
      <SectionTitle>重点问题</SectionTitle>

      <ul data-top-issues-list className="min-h-0 flex-1 flex flex-col gap-2">
        {context.topBodyIssues.map((issue) => {
          const active = resolved.issueId === issue.id
          const expanded = expandedIssueId === issue.id
          const locationTitle = issue.microContext.locationQualifier
            ? `${issue.label}｜${issue.microContext.locationQualifier}`
            : issue.label
          return (
            <li key={issue.id}>
              <button
                type="button"
                data-issue-card={issue.id}
                onClick={(event) => {
                  event.stopPropagation()
                  onIssueSelect(issue.id)
                }}
                aria-pressed={active}
                aria-expanded={expanded}
                className={cn(
                  "group w-full rounded-md border p-2.5 text-left transition-colors",
                  active
                    ? "border-primary bg-card shadow-[inset_3px_0_0_var(--primary)] ring-1 ring-primary/25"
                    : "border-border bg-card hover:border-primary/40 hover:bg-accent/25",
                )}
              >
                <div data-issue-card-header className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded text-[11px] font-bold",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {issue.rank}
                  </span>
                  <span data-issue-title className="min-w-0 text-sm font-semibold text-foreground">
                    {locationTitle}
                  </span>
                  <span
                    data-issue-attention-badge
                    className="shrink-0 rounded border border-event-unresolved/30 bg-event-unresolved-soft px-1.5 py-0.5 text-[11px] font-medium text-event-unresolved"
                  >
                    {issue.microContext.attentionBadge}
                  </span>
                  <span
                    className="ml-auto flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors group-hover:text-foreground"
                    aria-hidden
                  >
                    {expanded ? (
                      <ChevronUp className="size-3.5" />
                    ) : (
                      <ChevronDown className="size-3.5" />
                    )}
                  </span>
                </div>

                <IssueSummary issue={issue} />
                {expanded ? <ExpandedIssueBody issue={issue} /> : null}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function IssueSummary({ issue }: { issue: BodyIssue }) {
  return (
    <p
      data-issue-summary
      className="mt-2 line-clamp-2 text-[13px] font-medium leading-[1.45] text-foreground"
    >
      {issue.whyItMatters}
    </p>
  )
}

function ExpandedIssueBody({ issue }: { issue: BodyIssue }) {
  const context = issue.microContext

  return (
    <div data-issue-expanded-body className="mt-2.5 space-y-2 text-xs leading-relaxed">
      <IssueContextTags items={context.contextItems} />
      <div data-issue-supporting-evidence className="space-y-1.5 border-t border-border/70 pt-2">
        <IssueFactRow
          icon={<CalendarDays className="size-3.5" aria-hidden />}
          label="相关记录"
          value={context.relatedRecordsSummary}
        />
        <IssueFactRow
          icon={<Dumbbell className="size-3.5" aria-hidden />}
          label="相关负荷"
          value={context.exposureSummary}
          optional
        />
        <IssueCareStatus lines={context.careStatusLines} />
      </div>
    </div>
  )
}

function IssueContextTags({
  items,
}: {
  items: Array<{ label: string; detail: string }>
}) {
  if (items.length === 0) return null
  const visibleItems = items.slice(0, 3)
  return (
    <div data-issue-context-tags className="flex min-w-0 flex-wrap gap-1">
      {visibleItems.map((item) => (
        <span
          key={`${item.label}-${item.detail}`}
          data-issue-context-tag
          title={item.detail}
          className="max-w-[8rem] truncate rounded-sm bg-muted/80 px-1.5 py-0.5 text-[11px] font-medium leading-4 text-muted-foreground"
        >
          {item.label}
        </span>
      ))}
      {items.length > visibleItems.length ? (
        <span data-issue-context-tag className="px-1 py-0.5 text-[11px] leading-4 text-muted-foreground">
          +{items.length - visibleItems.length}
        </span>
      ) : null}
    </div>
  )
}

function IssueCareStatus({
  lines,
}: {
  lines: Array<{ kind: "care" | "status"; text: string }>
}) {
  if (lines.length === 0) return null
  return (
    <div data-issue-care-status className="pt-0.5">
      <p className="text-[11px] font-semibold text-muted-foreground">处理与状态</p>
      <ul data-issue-care-status-list className="mt-1 space-y-1 pl-[1.125rem] text-[11.5px] leading-[1.45] text-muted-foreground">
        {lines.map((line) => (
          <li
            key={`${line.kind}-${line.text}`}
            data-care-status-kind={line.kind}
            className={cn(
              "relative before:absolute before:-left-3 before:top-[0.48rem] before:size-1 before:rounded-full before:bg-muted-foreground/45",
              line.kind === "care" ? "text-foreground/75" : "text-muted-foreground",
            )}
          >
            {line.text}
          </li>
        ))}
      </ul>
    </div>
  )
}

function IssueFactRow({
  icon,
  label,
  value,
  optional,
}: {
  icon: ReactNode
  label: string
  value?: string
  optional?: boolean
}) {
  if (!value && optional) return null
  if (!value) return null

  return (
    <div
      data-issue-line={label}
      className="flex min-w-0 items-start gap-1.5 text-[11.5px] leading-[1.45]"
    >
      <span data-issue-fact-icon className="mt-px shrink-0 text-muted-foreground/75">
        {icon}
      </span>
      <p className="min-w-0">
        <span className="mr-1.5 font-medium text-muted-foreground">{label}</span>
        <span data-issue-fact-value className="font-medium tabular-nums text-foreground/80">
          {value}
        </span>
      </p>
    </div>
  )
}
