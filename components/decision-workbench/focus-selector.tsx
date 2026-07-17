"use client"

import { X } from "lucide-react"

export function FocusSelector({
  currentFocus,
  onClose,
}: {
  currentFocus: any
  onClose: () => void
}) {
  // Mock data for other focuses - in real app this would come from props
  const mockFocuses = [
    {
      kind: "care_concern",
      label: "左膝疼痛",
      priority: "本次需要讨论",
      current: true,
    },
    {
      kind: "goal",
      label: "恢复稳定跑步",
      priority: "待复核",
      current: false,
    },
  ]

  return (
    <div
      className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="absolute left-4 right-4 top-20 mx-auto max-w-md rounded-lg border border-border bg-card shadow-lg md:left-auto md:right-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">
            切换 Review Focus
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="p-2">
          {mockFocuses.map((focus, index) => (
            <button
              key={index}
              type="button"
              onClick={onClose}
              disabled={focus.current}
              className="flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-accent disabled:bg-accent/50 disabled:opacity-100"
            >
              <span
                className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded text-[10px] font-bold"
                style={{
                  backgroundColor:
                    focus.kind === "care_concern"
                      ? "var(--event-pain-soft)"
                      : "var(--event-training-soft)",
                  color:
                    focus.kind === "care_concern"
                      ? "var(--event-pain)"
                      : "var(--event-training)",
                }}
              >
                {focus.kind === "care_concern" ? "关" : "Goal"}
              </span>
              <div className="flex-1">
                <div className="text-sm font-semibold text-foreground">
                  {focus.label}
                </div>
                <div className="text-xs text-muted-foreground">
                  {focus.priority}
                </div>
              </div>
              {focus.current && (
                <span className="shrink-0 text-xs text-primary">当前</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
