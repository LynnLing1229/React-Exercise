import type {
  BodyIssue,
  BodyMapMarker,
  BodyMapRenderTarget,
  EvidenceGroup,
  EventType,
  IssueMicroContext,
  LoadSignal,
  PTReviewContext,
} from "./review-context"
import type {
  APIBodyMapMarker,
  APIIssueCard,
  APIRelatedRecord,
  PTReviewAPIResponse,
  SourceLink,
} from "./pt-review-api"

export function buildPTReviewContextFromApi(response: PTReviewAPIResponse): PTReviewContext {
  const markerIdsByThread = markerIdsByThreadId(response)
  const issues = response.issue_cards.map((card) => apiIssueCard(card, markerIdsByThread))

  return {
    uiLanguage: "zh-CN",
    review: {
      title: "PT 回顾",
      rangeLabel: `${response.review_range.start} 至 ${response.review_range.end}`,
      basisLabel: basisLabel(response.review_range.basis),
      dataStatus: dataStatusLabel(response.data_status),
      statusText: response.briefing.summary ?? "后端 PT Review read model。",
    },
    briefing: {
      loadSignals: apiLoadSignals(response),
      unresolvedCount: response.briefing.unresolved_items.length,
      outcomeCount: outcomeRecordCount(response),
    },
    bodyMap: {
      views: response.body_map.views.map((view) => ({ id: view.id, label: view.label })),
      markers: apiBodyMapMarkers(response),
      problemLocationsLocked: response.body_map.locked_layers.includes("problem_locations"),
      trainingReviewDefaultVisible: response.body_map.default_layers.training_review,
    },
    topBodyIssues: issues,
    evidenceGroups: apiEvidenceGroups(response),
    defaultFocusSuggestion: issues[0]
      ? { kind: "issue", id: issues[0].id }
      : { kind: "none" },
  }
}

function apiIssueCard(
  card: APIIssueCard,
  markerIdsByThread: Map<string, string>,
): BodyIssue {
  const micro = card.micro_context
  const microContext: IssueMicroContext = {
    locationQualifier: stringOptional(micro.location_qualifier),
    attentionBadge: micro.attention_badge,
    contextItems: micro.context_items.map((item) => ({
      label: requiredDisplayString(item.label, card.issue_id, "context_items.label"),
      detail: requiredDisplayString(item.detail, card.issue_id, "context_items.detail"),
    })),
    relatedRecordCount: requiredPositiveNumber(
      micro.related_record_count,
      card.issue_id,
      "related_record_count",
    ),
    relatedRecordDates: micro.related_record_dates,
    relatedRecordsSummary: requiredDisplayString(
      micro.related_records_summary,
      card.issue_id,
      "related_records_summary",
    ),
    careStatusLines: micro.care_status_lines.map((item) => ({
      kind: item.kind,
      text: item.text,
    })),
    exposureItems: micro.exposure_items.map((item) => ({
      activityType: item.activity_type,
      label: item.label,
      sessionCount: item.session_count,
    })),
    exposureSummary: stringOptional(micro.exposure_summary),
  }

  return {
    id: card.issue_id,
    rank: card.rank,
    label: card.display_title,
    whyItMatters: card.display_summary,
    microContext,
    relatedMarkerIds: card.thread_ids
      .map((threadId) => markerIdsByThread.get(threadId))
      .filter((value): value is string => Boolean(value)),
  }
}

function apiBodyMapMarkers(
  response: PTReviewAPIResponse,
): BodyMapMarker[] {
  const treatmentMarkers = Object.entries(response.body_map.selected_issue_contexts).flatMap(
    ([issueId, context]) =>
      context.pt_treatment_markers.map((marker) => ({
        ...marker,
        issue_id: marker.issue_id ?? issueId,
        marker_role: "pt_treatment_context" as const,
      })),
  )

  return [...response.body_map.markers, ...treatmentMarkers].map((marker) => {
    const markerRole = marker.marker_role
    const renderTarget = apiRenderTarget(marker, markerRole)
    const eventTypeCounts = normalizeEventTypeCounts(marker.event_type_counts ?? {})
    return {
      id: marker.marker_id,
      view: renderTarget.view ?? "front",
      renderTarget,
      side: marker.side ?? "unknown",
      broadRegion: marker.broad_region ?? "unknown",
      label: marker.label,
      markerRole,
      issueId: marker.issue_id,
      defaultVisible: marker.default_visible,
      specificLocations: marker.specific_location ? [marker.specific_location] : [],
      primaryEventType:
        markerRole === "pt_treatment_context"
          ? "intervention"
          : markerRole === "training_review"
            ? "training"
            : primaryEventType(eventTypeCounts),
      eventTypeCounts,
      relatedEventIds: sourceEventIds(marker.source),
      trainingLoad: markerRole === "training_review" && marker.muscle_id
        ? {
            muscleId: marker.muscle_id,
            muscleLabel: marker.label,
            knownSetCount: marker.known_set_count ?? 0,
            heatLevel: marker.heat_level,
            hasUnrecordedSets: marker.has_unrecorded_sets ?? false,
            roles: marker.roles ?? [],
            exercises: (marker.contributing_exercises ?? []).map((exercise) => ({
              exerciseLabel: exercise.exercise_label,
              canonicalExerciseLabel: exercise.canonical_exercise_label ?? undefined,
              knownSets: exercise.known_sets ?? undefined,
              hasUnrecordedSets: exercise.has_unrecorded_sets ?? false,
              occurrenceCount: exercise.occurrence_count,
              role: exercise.role,
              sourceEventIds: exercise.source_event_ids ?? [],
              sourceDraftIds: exercise.source_draft_ids ?? [],
            })),
          }
        : undefined,
    }
  })
}

function apiRenderTarget(
  marker: APIBodyMapMarker,
  markerRole: BodyMapMarker["markerRole"],
): BodyMapRenderTarget {
  const target = marker.render_target
  if (!target) throw new Error(`PT Review marker ${marker.marker_id} is missing backend render_target`)
  const base = {
    view: stringOptional(target.view),
    targetId: stringOptional(target.target_id),
    precision: stringOptional(target.precision),
    confidence: stringOptional(target.confidence),
    originalText: stringOptional(target.original_text),
    calloutLabel: target.callout_lines?.length
      ? target.callout_lines
      : stringValue(marker.display_text, stringValue(target.label, marker.label)),
    calloutSide: sideValue(target.callout_side),
    emphasis: markerRole === "pt_treatment_context" ? "context" : emphasisValue(target.emphasis),
  }

  if (target.kind === "region") {
    if (!target.region_target_ids?.length) {
      throw new Error(`PT Review marker ${marker.marker_id} region render_target is missing region_target_ids`)
    }
    return {
      kind: "region",
      ...base,
      regionTargetIds: target.region_target_ids.map(String),
      calloutAnchorId: stringOptional(target.callout_anchor_id),
      calloutAnchor: target.callout_anchor
        ? {
            x: numberValue(target.callout_anchor.x, 0.5),
            y: numberValue(target.callout_anchor.y, 0.5),
          }
        : undefined,
    }
  }
  if (target.kind === "accent") {
    return {
      kind: "accent",
      ...base,
      x: requiredNumber(target.x, marker.marker_id, "x"),
      y: requiredNumber(target.y, marker.marker_id, "y"),
      rx: requiredNumber(target.rx, marker.marker_id, "rx"),
      ry: requiredNumber(target.ry, marker.marker_id, "ry"),
      rotate: target.rotate === undefined ? undefined : numberValue(target.rotate, 0),
      referenceRegionTargetIds: (target.reference_region_target_ids ?? []).map(String),
      shape: target.shape === "pill" ? "pill" : "dot",
    }
  }
  throw new Error(`PT Review marker ${marker.marker_id} has unknown render_target kind`)
}

function apiLoadSignals(response: PTReviewAPIResponse): PTReviewContext["briefing"]["loadSignals"] {
  const groupedSignals = response.briefing.load_signals.map((signal) => ({
    group: signal.group,
    signal: {
      id: signal.id,
      value: signal.value,
    } satisfies LoadSignal,
  }))

  return {
    exposure: groupedSignals
      .filter(({ group }) => group === "exposure")
      .map(({ signal }) => signal),
    response: groupedSignals
      .filter(({ group }) => group === "response")
      .map(({ signal }) => signal),
  }
}

function apiEvidenceGroups(
  response: PTReviewAPIResponse,
): EvidenceGroup[] {
  return (response.related_records.groups ?? []).map((group) => ({
    id: group.group_id,
    issueId: group.issue_id,
    date: group.date,
    sceneTitle: group.scene_title,
    roleLabel: group.narrative_role,
    slots: group.records.map(apiEvidenceSlot),
    sourceDraftIds: sourceDraftIds(group.source),
    pendingConfirmation: false,
    sourceLabel: "已确认记录",
  }))
}

function apiEvidenceSlot(record: APIRelatedRecord): EvidenceGroup["slots"][number] {
  return {
    kind: evidenceSlotKind(record.slot),
    label: record.role_label,
    text: record.summary,
    eventIds: unique([...record.event_ids, ...sourceEventIds(record.source)]),
  }
}

function evidenceSlotKind(value: APIRelatedRecord["slot"]): EvidenceGroup["slots"][number]["kind"] {
  if (value === "body_reaction") return "presentation"
  if (value === "adjustment_intervention") return "adjustment"
  if (value === "followup_outcome") return "follow_up"
  return "context"
}

function outcomeRecordCount(response: PTReviewAPIResponse) {
  return (response.related_records.groups ?? []).reduce(
    (count, group) => count + group.records.filter(
      (record) => record.slot === "followup_outcome" && record.followup_status === "已记录",
    ).length,
    0,
  )
}

function markerIdsByThreadId(response: PTReviewAPIResponse) {
  const refs = new Map<string, string>()
  for (const marker of response.body_map.markers ?? []) {
    if (marker.thread_id) refs.set(marker.thread_id, marker.marker_id)
  }
  return refs
}

function primaryEventType(counts: Partial<Record<EventType, number>>): EventType {
  const ranked = Object.entries(counts).sort((left, right) => Number(right[1]) - Number(left[1]))
  return (ranked[0]?.[0] as EventType | undefined) ?? "note"
}

function normalizeEventTypeCounts(counts: Record<string, number>): Partial<Record<EventType, number>> {
  return Object.fromEntries(
    Object.entries(counts).map(([key, value]) => [key === "body_status" ? "pain" : key, value]),
  ) as Partial<Record<EventType, number>>
}

function basisLabel(value: string | null | undefined) {
  if (value === "requested_range") return "当前选择区间"
  if (!value) return "当前复盘区间"
  return value
}

function dataStatusLabel(value: PTReviewAPIResponse["data_status"]) {
  if (value === "official_history") return "已确认记录"
  return "无记录"
}

function sourceEventIds(source: SourceLink | undefined | null) {
  return source?.source_event_ids ?? []
}

function sourceDraftIds(source: SourceLink | undefined | null) {
  return source?.source_draft_ids ?? []
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.length > 0 ? value : fallback
}

function stringOptional(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined
}

function requiredDisplayString(value: unknown, issueId: string, field: string) {
  if (typeof value === "string" && value.length > 0) return value
  throw new Error(`PT Review issue ${issueId} is missing backend micro_context.${field}`)
}

function requiredPositiveNumber(value: unknown, issueId: string, field: string) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value
  throw new Error(`PT Review issue ${issueId} is missing positive backend micro_context.${field}`)
}

function numberValue(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function requiredNumber(value: unknown, markerId: string, field: string) {
  if (typeof value === "number" && Number.isFinite(value)) return value
  throw new Error(`PT Review marker ${markerId} accent render_target is missing numeric ${field}`)
}

function sideValue(value: unknown): "left" | "right" | undefined {
  return value === "left" || value === "right" ? value : undefined
}

function emphasisValue(value: unknown): "context" | "normal" | undefined {
  return value === "context" || value === "normal" ? value : undefined
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)]
}
