import type { PTReviewContext } from "@/src/features/pt-review/review-context"

export function StatusHeader({ context }: { context: PTReviewContext }) {
  const review = context.review
  const chips = briefingChips(context)

  return (
    <header className="flex flex-col gap-2 border-b border-border bg-card px-4 py-3 md:px-6">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex size-6 items-center justify-center rounded-md bg-primary text-[11px] font-bold text-primary-foreground">
            PT
          </span>
          <h1 className="text-base font-semibold text-foreground">
            {review.title}
          </h1>
          <span className="hidden text-sm text-muted-foreground sm:inline">｜</span>
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {review.rangeLabel}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-event-unresolved/40 bg-event-unresolved-soft px-2 py-1 text-xs font-medium text-event-unresolved">
            <span className="size-1.5 rounded-full bg-event-unresolved" aria-hidden />
            {review.dataStatus}
          </span>
          <span
            className="hidden max-w-xs text-[11px] leading-relaxed text-muted-foreground xl:inline"
            title={review.statusText}
          >
            {review.statusText}
          </span>
        </div>
      </div>

      <div className="relative min-w-0">
        <div className="scrollbar-none flex items-center gap-1.5 overflow-x-auto pr-8">
          <span className="shrink-0 text-xs text-muted-foreground">
            {review.basisLabel}
          </span>
          {chips.map((chip) => (
            <span
              key={chip.label}
              className="shrink-0 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium text-foreground"
            >
              {chip.label}
            </span>
          ))}
        </div>
        <span
          className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-card to-transparent"
          aria-hidden
        />
      </div>
    </header>
  )
}

function briefingChips(context: PTReviewContext) {
  const trainingDays = signalValue(context, "signal_training_days")
  const runCount = signalValue(context, "signal_runs")
  const runVolume = signalValue(context, "signal_coros_run_volume")?.split("/")[0]?.trim()
  const painDays = signalValue(context, "signal_repeated_pain_days")
  const unresolvedCount = context.briefing.unresolvedCount
  const outcomeCount = context.briefing.outcomeCount

  return [
    trainingDays ? { label: `训练 ${trainingDays}` } : null,
    runCount && runVolume ? { label: `跑步 ${runCount}｜${runVolume}` } : null,
    painDays ? { label: `疼痛 ${painDays}` } : null,
    { label: `待跟进 ${unresolvedCount}` },
    { label: `结果记录 ${outcomeCount}` },
  ].filter((chip): chip is { label: string } => Boolean(chip))
}

function signalValue(context: PTReviewContext, id: string) {
  const signals = [
    ...context.briefing.loadSignals.exposure,
    ...context.briefing.loadSignals.response,
  ]
  return signals.find((signal) => signal.id === id)?.value
}
