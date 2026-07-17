export interface APIUnresolvedItem {
  id: string
  status_label: string
  prompt: string
  related_draft_ids: string[]
  source?: SourceLink
}

export interface PTReviewAPIResponse {
  schema_name: "pt_review_api"
  schema_version: 1
  tracked_person_id: string
  review_range: {
    start: string
    end: string
    basis?: string | null
    fallback_used?: boolean | null
  }
  generated_at: string
  data_status: "official_history" | "empty"
  briefing: {
    summary?: string | null
    load_signals: APILoadSignal[]
    unresolved_items: APIUnresolvedItem[]
    source?: SourceLink | null
  }
  issue_cards: APIIssueCard[]
  body_map: {
    views: Array<{ id: "front" | "back"; label: string }>
    markers: APIBodyMapMarker[]
    default_layers: {
      problem_locations: true
      training_review: boolean
    }
    locked_layers: Array<"problem_locations">
    selected_issue_contexts: Record<string, APISelectedIssueContext>
    source?: SourceLink | null
  }
  related_records: {
    groups?: APIRelatedRecordGroup[]
    source?: SourceLink | null
  }
}

export interface APIIssueCard {
  issue_id: string
  thread_ids: string[]
  display_title: string
  display_summary: string
  rank: number
  selection_reason: string
  micro_context: APIIssueMicroContext
  body_locations: APIBodyLocation[]
  source: SourceLink
}

export interface APIIssueMicroContext {
  location_qualifier?: string | null
  attention_badge: "反复出现" | "单次出现" | "待跟进"
  context_items: Array<{
    label: string
    detail: string
    source: SourceLink
  }>
  related_record_count: number
  related_record_dates: string[]
  related_records_summary: string
  care_status_lines: Array<{
    kind: "care" | "status"
    text: string
    source: SourceLink
  }>
  exposure_items: Array<{
    activity_type: "strength" | "rehab" | "cardio"
    label: string
    session_count: number
    source: SourceLink
  }>
  exposure_summary?: string | null
  selection_reason: string
}

export interface APILoadSignal {
  id: string
  label: string
  value: string
  group: "exposure" | "response"
  tone: "neutral" | "attention"
  notes?: string | null
  source_kind?: string | null
  source: SourceLink
}

export interface APIBodyMapMarker {
  marker_id: string
  thread_id?: string
  issue_id?: string
  label: string
  display_text?: string
  marker_role: "problem" | "pt_treatment_context" | "training_review"
  default_visible: boolean
  side?: string
  broad_region?: string
  specific_location?: string | null
  event_type_counts?: Record<string, number>
  muscle_id?: string
  known_set_count?: number
  heat_level: number | null
  has_unrecorded_sets?: boolean
  roles?: string[]
  contributing_exercises?: Array<{
    exercise_label: string
    canonical_exercise_label?: string | null
    known_sets?: number | null
    has_unrecorded_sets?: boolean
    occurrence_count: number
    role: string
    source_event_ids?: string[]
    source_draft_ids?: string[]
  }>
  render_target: {
    target_id?: string
    kind?: "region" | "accent" | string
    view?: string
    precision?: string
    confidence?: string
    original_text?: string
    label?: string
    callout_lines?: string[]
    x?: number
    y?: number
    rx?: number
    ry?: number
    rotate?: number
    shape?: "dot" | "pill" | string
    region_target_ids?: string[]
    reference_region_target_ids?: string[]
    callout_anchor_id?: string
    callout_anchor?: { x?: number; y?: number }
    callout_side?: "left" | "right" | string
    emphasis?: "context" | "normal" | string
  }
  source: SourceLink
}

export interface APIBodyLocation {
  side: string
  broad_region: string
  specific_location: string | null
  original_text: string
  canonical_location_id?: string | null
  related_regions?: string[]
  confidence?: string | number | null
}

export interface APISelectedIssueContext {
  issue_id: string
  thread_id: string
  pt_treatment_markers: APIBodyMapMarker[]
  training_review_layer_default: boolean
}

export interface APIRelatedRecordGroup {
  group_id: string
  thread_id: string
  issue_id: string
  date: string
  display_title: string
  narrative_role: "上次治疗" | "首次记录" | "二次记录" | "再次记录" | "最近记录"
  scene_title: string
  group_kind: "first_screen_narrative_evidence"
  records: APIRelatedRecord[]
  unresolved_item_ids: string[]
  source: SourceLink
}

export interface APIRelatedRecord {
  slot: "context" | "body_reaction" | "adjustment_intervention" | "followup_outcome"
  date: string
  event_ids: string[]
  role_label: string
  title: string
  summary: string
  followup_status: "已记录" | "待跟进"
  care_classifications: Array<{
    event_id: string
    step_type: string | null
    source_category: string
    display_label: string
  }>
  source: SourceLink
}

export interface SourceLink {
  source_event_ids?: string[]
  source_draft_ids?: string[]
  source_refs?: string[]
}
