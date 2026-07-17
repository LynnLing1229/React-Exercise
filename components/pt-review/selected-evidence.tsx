"use client"

import { useEffect, useRef, useState } from "react"
import {
  type EvidenceGroup,
  type EvidenceSlot,
  type ResolvedFocus,
} from "@/src/features/pt-review/review-context"

const SLOT_LABEL: Record<EvidenceSlot["kind"], string> = {
  context: "出现情境",
  presentation: "身体反应",
  adjustment: "处理/调整",
  follow_up: "结果/跟进",
}

export function SelectedEvidence({
  resolved,
}: {
  resolved: ResolvedFocus
}) {
  const [showAll, setShowAll] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const focusKey = resolved.focus.kind === "none"
    ? "none"
    : `${resolved.focus.kind}:${resolved.focus.id}`
  const groups = resolved.evidenceGroups
  const shouldCollapse = groups.length >= 5
  const visibleGroups = shouldCollapse && !showAll ? groups.slice(0, 3) : groups

  useEffect(() => {
    setShowAll(false)
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [focusKey])

  return (
    <div className="flex h-full flex-col">
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-start justify-between gap-3">
          <h2 className="min-w-0 truncate text-sm font-semibold text-foreground">
            相关记录
          </h2>
          <p className="shrink-0 text-[11px] font-medium text-muted-foreground">
            <span className="text-primary">{resolved.title}</span>
            <span className="mx-1 text-border">｜</span>
            {groups.length} 组
          </p>
        </div>
      </div>

      <div ref={scrollRef} data-related-records-scroll className="flex-1 overflow-y-auto p-3">
        {visibleGroups.length > 0 ? (
          <ol data-related-timeline className="flex flex-col">
            {visibleGroups.map((group, index) => (
              <EvidenceGroupItem
                key={group.id}
                group={group}
                isLast={index === visibleGroups.length - 1}
              />
            ))}
          </ol>
        ) : (
          <p className="py-6 text-center text-xs text-muted-foreground">
            当前区间暂无已确认的相关记录
          </p>
        )}

        {shouldCollapse ? (
          <button
            type="button"
            onClick={() => setShowAll((current) => !current)}
            className="mt-2 w-full rounded-md border border-dashed border-border px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            {showAll ? "收起" : `显示其余 ${groups.length - visibleGroups.length} 组`}
          </button>
        ) : null}
      </div>
    </div>
  )
}

function EvidenceGroupItem({
  group,
  isLast,
}: {
  group: EvidenceGroup
  isLast: boolean
}) {
  const meta = [
    group.sourceLabel,
    group.sourceLabel && group.pendingConfirmation ? "待确认" : null,
  ].filter(Boolean)

  return (
    <li
      data-related-group-id={group.id}
      data-related-group-date={group.date}
      className="relative grid grid-cols-[2.5rem_0.625rem_minmax(0,1fr)] gap-x-1.5 sm:grid-cols-[2.75rem_0.75rem_minmax(0,1fr)] sm:gap-x-2"
    >
      <div data-related-timeline-date className="relative -top-0.5 min-w-0 pr-1 text-right sm:pr-1.5">
        <time dateTime={group.date} className="font-mono text-[11px] font-medium leading-5 text-muted-foreground">
          {group.date.slice(5)}
        </time>
      </div>

      <div data-related-timeline-separator className="relative flex justify-center">
        <span data-related-timeline-node className="absolute top-[0.4375rem] z-10 size-2 rounded-full bg-primary ring-4 ring-background" aria-hidden />
        {isLast ? null : (
          <span data-related-timeline-rail className="absolute inset-x-auto bottom-0 top-[1.1875rem] w-px bg-border" aria-hidden />
        )}
      </div>

      <div data-related-timeline-content className={`min-w-0 ${isLast ? "pb-0.5" : "pb-5"}`}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span data-related-role-tag className="shrink-0 rounded-sm bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground">
            {group.roleLabel ?? "相关记录"}
          </span>
          <span data-related-scene-title className="min-w-0 text-[13px] font-semibold leading-5 text-foreground">
            {group.sceneTitle}
          </span>

          {meta.length > 0 ? (
            <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
              {meta.join("｜")}
            </span>
          ) : null}
        </div>

        <dl className="mt-2 space-y-1.5">
          {group.slots.map((slot) => (
            <EvidenceSlotRow key={`${slot.kind}-${slot.eventIds.join("-")}`} slot={slot} />
          ))}
        </dl>
      </div>
    </li>
  )
}

function EvidenceSlotRow({ slot }: { slot: EvidenceSlot }) {
  return (
    <div data-related-slot={slot.kind} className="grid grid-cols-[4rem_minmax(0,1fr)] gap-2 text-xs leading-relaxed">
      <dt className="text-[11px] font-medium text-muted-foreground">
        {slot.label ?? SLOT_LABEL[slot.kind]}
      </dt>
      <dd className="text-foreground">{slot.text}</dd>
    </div>
  )
}
