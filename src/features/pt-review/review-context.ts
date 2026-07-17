export type EventType =
  | "training"
  | "pain"
  | "pt_visit"
  | "intervention"
  | "outcome"
  | "note"

export type Focus =
  | { kind: "issue"; id: string }
  | { kind: "marker"; id: string }
  | { kind: "none" }

export interface PTReviewContext {
  uiLanguage: "zh-CN"
  review: {
    title: string
    rangeLabel: string
    basisLabel: string
    dataStatus: string
    statusText: string
  }
  briefing: {
    loadSignals: {
      exposure: LoadSignal[]
      response: LoadSignal[]
    }
    unresolvedCount: number
    outcomeCount: number
  }
  bodyMap: {
    views: BodyMapView[]
    markers: BodyMapMarker[]
    problemLocationsLocked?: boolean
    trainingReviewDefaultVisible?: boolean
  }
  topBodyIssues: BodyIssue[]
  evidenceGroups: EvidenceGroup[]
  defaultFocusSuggestion: Focus
}

export interface BodyMapView {
  id: "front" | "back" | "left" | "right" | string
  label: string
}

export interface BodyMapMarker {
  id: string
  view: string
  renderTarget?: BodyMapRenderTarget
  side: string
  broadRegion: string
  label: string
  markerRole?: "problem" | "pt_treatment_context" | "training_review" | string
  issueId?: string
  defaultVisible?: boolean
  specificLocations: string[]
  primaryEventType: EventType
  eventTypeCounts: Partial<Record<EventType, number>>
  relatedEventIds: string[]
  trainingLoad?: TrainingLoadSummary
}

export interface TrainingLoadSummary {
  muscleId: string
  muscleLabel: string
  knownSetCount: number
  heatLevel: number | null
  hasUnrecordedSets: boolean
  roles: string[]
  exercises: TrainingLoadExercise[]
}

export interface TrainingLoadExercise {
  exerciseLabel: string
  canonicalExerciseLabel?: string
  knownSets?: number
  hasUnrecordedSets: boolean
  occurrenceCount: number
  role: string
  sourceEventIds: string[]
  sourceDraftIds: string[]
}

export type BodyMapRenderTarget =
  | {
      kind: "region"
      view?: string
      targetId?: string
      precision?: string
      confidence?: string
      originalText?: string
      regionTargetIds: string[]
      calloutAnchorId?: string
      calloutAnchor?: { x: number; y: number }
      calloutLabel?: string | string[]
      calloutSide?: "left" | "right"
      emphasis?: "context" | "normal"
    }
  | {
      kind: "accent"
      view?: string
      targetId?: string
      precision?: string
      confidence?: string
      originalText?: string
      x: number
      y: number
      rx: number
      ry: number
      rotate?: number
      referenceRegionTargetIds?: string[]
      shape?: "dot" | "pill"
      calloutLabel: string | string[]
      calloutSide?: "left" | "right"
      emphasis?: "context" | "normal"
    }

export interface BodyIssue {
  id: string
  rank: number
  label: string
  whyItMatters: string
  microContext: IssueMicroContext
  relatedMarkerIds: string[]
}

export interface IssueMicroContext {
  locationQualifier?: string
  attentionBadge: "反复出现" | "单次出现" | "待跟进"
  contextItems: IssueContextItem[]
  relatedRecordCount: number
  relatedRecordDates: string[]
  relatedRecordsSummary: string
  careStatusLines: IssueCareStatusLine[]
  exposureItems: IssueExposureItem[]
  exposureSummary?: string
}

export interface IssueContextItem {
  label: string
  detail: string
}

export interface IssueCareStatusLine {
  kind: "care" | "status"
  text: string
}

export interface IssueExposureItem {
  activityType: "strength" | "rehab" | "cardio"
  label: string
  sessionCount: number
}

export function visibleBodyMapMarkers(
  context: PTReviewContext,
  selectedIssueId: string | null,
  trainingReviewVisible: boolean,
): BodyMapMarker[] {
  return context.bodyMap.markers.filter((marker) => {
    if (marker.markerRole === "pt_treatment_context") {
      return Boolean(selectedIssueId && marker.issueId === selectedIssueId)
    }
    if (marker.markerRole === "training_review") return trainingReviewVisible
    return marker.markerRole === "problem" || marker.defaultVisible !== false
  })
}

export interface LoadSignal {
  id: string
  value: string
}

export type EvidenceSlotKind = "context" | "presentation" | "adjustment" | "follow_up"

export interface EvidenceSlot {
  kind: EvidenceSlotKind
  label?: string
  text: string
  eventIds: string[]
}

export interface EvidenceGroup {
  id: string
  issueId: string
  date: string
  sceneTitle: string
  roleLabel?: string
  slots: EvidenceSlot[]
  sourceDraftIds: string[]
  pendingConfirmation: boolean
  sourceLabel?: string
}

export interface ResolvedFocus {
  focus: Focus
  title: string
  markerIds: Set<string>
  issueId: string | null
  evidenceGroups: EvidenceGroup[]
}

export const EVENT_STYLE: Record<
  EventType,
  { label: string; dot: string; softBg: string; text: string; border: string }
> = {
  training: {
    label: "训练",
    dot: "bg-event-training",
    softBg: "bg-event-training-soft",
    text: "text-event-training",
    border: "border-event-training/30",
  },
  pain: {
    label: "疼痛/身体问题",
    dot: "bg-event-pain",
    softBg: "bg-event-pain-soft",
    text: "text-event-pain",
    border: "border-event-pain/30",
  },
  pt_visit: {
    label: "PT 到访",
    dot: "bg-event-pt-visit",
    softBg: "bg-event-pt-visit-soft",
    text: "text-event-pt-visit",
    border: "border-event-pt-visit/30",
  },
  intervention: {
    label: "处理/干预",
    dot: "bg-event-intervention",
    softBg: "bg-event-intervention-soft",
    text: "text-event-intervention",
    border: "border-event-intervention/30",
  },
  outcome: {
    label: "后续结果",
    dot: "bg-event-outcome",
    softBg: "bg-event-outcome-soft",
    text: "text-event-outcome",
    border: "border-event-outcome/30",
  },
  note: {
    label: "备注",
    dot: "bg-event-note",
    softBg: "bg-event-note-soft",
    text: "text-event-note",
    border: "border-event-note/30",
  },
}

export function resolveFocus(
  context: PTReviewContext,
  focus: Focus,
): ResolvedFocus {
  if (focus.kind === "issue") {
    const issue = context.topBodyIssues.find((item) => item.id === focus.id)
    if (!issue) return resolveDefaultFocus(context)
    return {
      focus,
      title: issue.label,
      markerIds: new Set(issue.relatedMarkerIds),
      issueId: issue.id,
      evidenceGroups: groupsForIssue(context, issue.id),
    }
  }

  if (focus.kind === "marker") {
    const marker = context.bodyMap.markers.find((item) => item.id === focus.id)
    if (!marker) return resolveDefaultFocus(context)
    const issue = context.topBodyIssues.find((item) =>
      item.relatedMarkerIds.includes(marker.id),
    )
    const issueId = marker.issueId ?? issue?.id ?? null
    return {
      focus,
      title: marker.label,
      markerIds: new Set([marker.id]),
      issueId,
      evidenceGroups: groupsForIssue(context, issueId),
    }
  }

  return {
    focus,
    title: "当前区间",
    markerIds: new Set(),
    issueId: null,
    evidenceGroups: [],
  }
}

function resolveDefaultFocus(context: PTReviewContext): ResolvedFocus {
  if (context.defaultFocusSuggestion.kind === "none") {
    return resolveFocus(context, { kind: "none" })
  }
  return resolveFocus(context, context.defaultFocusSuggestion)
}

function groupsForIssue(
  context: PTReviewContext,
  issueId: string | null,
): EvidenceGroup[] {
  return context.evidenceGroups
    .filter((group) => issueId && group.issueId === issueId)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
}
