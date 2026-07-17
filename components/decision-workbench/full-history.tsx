"use client"

export function FullHistory({ data }: { data: any }) {
  const careEpisode = data.careEpisode
  const missingness = data.missingness || []
  const careConcern = data.careConcern

  return (
    <div className="space-y-4" data-testid="full-history">
      {/* Care Episode Info */}
      <section className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          Care Episode 信息
        </h3>
        <div className="space-y-2">
          <div>
            <span className="text-xs font-medium text-muted-foreground">
              Episode：
            </span>
            <span className="ml-2 text-sm text-foreground">
              {careEpisode.label}
            </span>
          </div>
          {careEpisode.startDate && (
            <div>
              <span className="text-xs font-medium text-muted-foreground">
                开始日期：
              </span>
              <span className="ml-2 font-mono text-sm text-foreground">
                {careEpisode.startDate}
              </span>
            </div>
          )}
          {careEpisode.startReason && (
            <div>
              <span className="text-xs font-medium text-muted-foreground">
                开始原因：
              </span>
              <p className="mt-1 text-sm leading-relaxed text-foreground">
                {careEpisode.startReason}
              </p>
            </div>
          )}
          {careEpisode.membership && (
            <p className="text-xs leading-relaxed text-muted-foreground">
              {careEpisode.membership}
            </p>
          )}
        </div>
      </section>

      {/* Care Concern */}
      {careConcern && (
        <section className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            Care Concern
          </h3>
          <div className="space-y-2">
            <div>
              <span className="text-xs font-medium text-muted-foreground">
                关注：
              </span>
              <span className="ml-2 text-sm text-foreground">
                {careConcern.label}
              </span>
            </div>
            {careConcern.continuity && (
              <p className="text-sm leading-relaxed text-foreground">
                {careConcern.continuity}
              </p>
            )}
            {careConcern.currentState && (
              <div>
                <span className="text-xs font-medium text-muted-foreground">
                  当前状态：
                </span>
                <span className="ml-2 text-sm text-foreground">
                  {careConcern.currentState}
                </span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Missingness Summary */}
      {missingness.length > 0 && (
        <section className="rounded-lg border border-event-unresolved/30 bg-event-unresolved-soft p-4">
          <h3 className="mb-3 text-sm font-semibold text-event-unresolved">
            缺失内容清单
          </h3>
          <ul className="space-y-2">
            {missingness.map((item: any, index: number) => (
              <li
                key={index}
                className="flex items-start gap-2 text-sm text-event-unresolved"
              >
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-event-unresolved" />
                <div>
                  <span className="font-medium">{item.kind}:</span> {item.label}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Later Visit Without Restated Reasoning */}
      {data.laterVisitWithoutRestatedReasoning && (
        <section className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            较新 Visit 但推理未重述
          </h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">
                {data.laterVisitWithoutRestatedReasoning.date}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-foreground">
              {data.laterVisitWithoutRestatedReasoning.performedActions}
            </p>
            <p className="text-sm leading-relaxed text-foreground">
              {data.laterVisitWithoutRestatedReasoning.display}
            </p>
            {data.laterVisitWithoutRestatedReasoning.source && (
              <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {data.laterVisitWithoutRestatedReasoning.source.displayLabel}
              </span>
            )}
          </div>
        </section>
      )}

      {/* Unresolved Source Conflict */}
      {data.unresolvedSourceConflict && (
        <section className="rounded-lg border border-event-unresolved/30 bg-event-unresolved-soft p-4">
          <h3 className="mb-3 text-sm font-semibold text-event-unresolved">
            来源冲突待澄清
          </h3>
          <div className="space-y-3">
            <div>
              <h4 className="mb-1 text-xs font-medium text-muted-foreground">
                较老但来源较强：
              </h4>
              <p className="text-sm leading-relaxed text-foreground">
                {data.unresolvedSourceConflict.olderStrongerStatement}
              </p>
            </div>
            <div>
              <h4 className="mb-1 text-xs font-medium text-muted-foreground">
                较新但来源较弱：
              </h4>
              <p className="text-sm leading-relaxed text-foreground">
                {data.unresolvedSourceConflict.newerWeakerStatement}
              </p>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {data.unresolvedSourceConflict.display}
            </p>
          </div>
        </section>
      )}

      {/* Multi-Focus Visit Example */}
      {data.multiFocusVisitExample && (
        <section className="rounded-lg border border-dashed border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
            多 Focus Visit 示例
          </h3>
          <p className="mb-2 text-sm text-foreground">
            {data.multiFocusVisitExample.visitLabel}
          </p>
          <div className="space-y-2">
            <div>
              <span className="text-xs font-medium text-muted-foreground">
                涉及 Focus：
              </span>
              <div className="mt-1 flex flex-wrap gap-1">
                {data.multiFocusVisitExample.focuses.map((focus: string) => (
                  <span
                    key={focus}
                    className="rounded-sm bg-primary/10 px-2 py-0.5 text-xs text-primary"
                  >
                    {focus}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground">
                步骤归属：
              </span>
              <ul className="mt-1 space-y-1">
                {data.multiFocusVisitExample.stepMembership.map(
                  (item: any, idx: number) => (
                    <li key={idx} className="text-xs leading-relaxed text-foreground">
                      {item.step}
                      {item.belongsTo.length > 0 ? (
                        <span className="ml-2 text-muted-foreground">
                          → {item.belongsTo.join(", ")}
                        </span>
                      ) : (
                        <span className="ml-2 text-muted-foreground">
                          (仅 Visit 上下文)
                        </span>
                      )}
                      {item.note && (
                        <span className="ml-2 text-muted-foreground">
                          - {item.note}
                        </span>
                      )}
                    </li>
                  ),
                )}
              </ul>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
