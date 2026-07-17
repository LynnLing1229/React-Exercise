import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import {
  EVENT_STYLE,
  type EventType,
} from "@/src/features/pt-review/review-context"

export function EventTypeChip({ type }: { type: EventType }) {
  const style = EVENT_STYLE[type]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium",
        style.softBg,
        style.text,
      )}
    >
      <span className={cn("size-1.5 rounded-full", style.dot)} aria-hidden />
      {style.label}
    </span>
  )
}

export function DraftBadge({
  state = "draft",
}: {
  state?: "draft" | "confirmed"
}) {
  if (state === "confirmed") {
    return (
      <span className="inline-flex items-center rounded-md border border-event-outcome/30 bg-event-outcome-soft px-1.5 py-0.5 text-[11px] font-medium text-event-outcome">
        已确认
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-event-unresolved/40 bg-event-unresolved-soft px-1.5 py-0.5 text-[11px] font-medium text-event-unresolved">
      待确认
    </span>
  )
}

export function SectionTitle({
  children,
  hint,
  right,
}: {
  children: ReactNode
  hint?: string
  right?: ReactNode
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <div className="flex items-baseline gap-2">
        <h2 className="text-sm font-semibold text-foreground">{children}</h2>
        {hint ? (
          <span className="text-xs text-muted-foreground">{hint}</span>
        ) : null}
      </div>
      {right}
    </div>
  )
}

export function Panel({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn("rounded-lg border border-border bg-card", className)}>
      {children}
    </section>
  )
}
