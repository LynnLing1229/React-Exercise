import { readFile } from "node:fs/promises"
import path from "node:path"
import { buildPTReviewContextFromApi } from "../src/features/pt-review/api-to-review-context.ts"
import {
  resolveFocus,
  visibleBodyMapMarkers,
} from "../src/features/pt-review/review-context.ts"

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const source = (eventIds, draftIds = []) => ({
  source_event_ids: eventIds,
  source_draft_ids: draftIds,
})

const problemMarker = {
  marker_id: "marker_left_knee",
  thread_id: "thread_left_knee",
  issue_id: "issue_left_knee",
  label: "左膝",
  marker_role: "problem",
  default_visible: true,
  side: "left",
  broad_region: "knee",
  specific_location: "左膝前侧",
  event_type_counts: { pain: 2 },
  heat_level: null,
  render_target: {
    kind: "region",
    view: "front",
    region_target_ids: ["bodymap_region_left_knee"],
    label: "左膝",
  },
  source: source(["event_pain"], ["draft_pain"]),
}

const apiResponse = {
  schema_name: "pt_review_api",
  schema_version: 1,
  tracked_person_id: "owner",
  review_range: {
    start: "2026-07-01",
    end: "2026-07-09",
    basis: "requested_range",
  },
  generated_at: "2026-07-10T00:00:00Z",
  data_status: "official_history",
  briefing: {
    summary: "当前区间已确认记录。",
    load_signals: [
      {
        id: "signal_training_days",
        label: "训练天数",
        value: "4 天",
        group: "exposure",
        tone: "neutral",
        source: source(["event_training"]),
      },
      {
        id: "signal_repeated_pain_days",
        label: "疼痛天数",
        value: "2 天",
        group: "response",
        tone: "attention",
        source: source(["event_pain"]),
      },
    ],
    unresolved_items: [
      {
        id: "unresolved_left_knee",
        status_label: "待跟进",
        prompt: "跑后左膝是否持续？",
        related_draft_ids: ["draft_pain"],
        source: source(["event_pain"]),
      },
    ],
    source: source(["event_training", "event_pain"]),
  },
  issue_cards: [
    {
      issue_id: "issue_left_knee",
      thread_ids: ["thread_left_knee"],
      display_title: "左膝",
      display_summary: "跑步及训练中出现疼痛；短暂改善后复现，后续待确认。",
      rank: 1,
      selection_reason: "recurrent",
      micro_context: {
        location_qualifier: "前侧",
        attention_badge: "反复出现",
        context_items: [
          { label: "跑步", detail: "跑步时出现", source: source(["event_pain"]) },
          { label: "箭步蹲", detail: "训练时出现", source: source(["event_pain"]) },
        ],
        related_record_count: 3,
        related_record_dates: ["2026-07-01", "2026-07-06", "2026-07-09"],
        related_records_summary: "3 次｜7/1、7/6、7/9",
        care_status_lines: [
          {
            kind: "care",
            text: "PT局部处理、训练中调整动作和跑步中调整落地方式",
            source: source(["event_care"]),
          },
          { kind: "status", text: "后续待确认", source: source(["event_pain"]) },
        ],
        exposure_items: [
          {
            activity_type: "strength",
            label: "下肢训练",
            session_count: 2,
            source: source(["event_training"]),
          },
        ],
        exposure_summary: "下肢训练 2 次",
        selection_reason: "recurrent",
      },
      body_locations: [
        {
          side: "left",
          broad_region: "knee",
          specific_location: "左膝前侧",
          original_text: "左膝前侧",
        },
      ],
      source: source(["event_pain"], ["draft_pain"]),
    },
  ],
  body_map: {
    views: [
      { id: "front", label: "正面" },
      { id: "back", label: "背面" },
    ],
    markers: [
      problemMarker,
      {
        marker_id: "marker_training_left_quad",
        label: "左股四头肌",
        marker_role: "training_review",
        default_visible: false,
        side: "left",
        broad_region: "thigh",
        muscle_id: "left_quadriceps",
        known_set_count: 6,
        heat_level: 3,
        roles: ["primary"],
        contributing_exercises: [
          {
            exercise_label: "分腿蹲",
            known_sets: 3,
            has_unrecorded_sets: false,
            occurrence_count: 1,
            role: "primary",
            source_event_ids: ["event_training"],
            source_draft_ids: ["draft_training"],
          },
        ],
        render_target: {
          kind: "region",
          view: "front",
          region_target_ids: ["bodymap_region_left_quadriceps"],
          label: "左股四头肌",
        },
        source: source(["event_training"], ["draft_training"]),
      },
    ],
    default_layers: { problem_locations: true, training_review: false },
    locked_layers: ["problem_locations"],
    selected_issue_contexts: {
      issue_left_knee: {
        issue_id: "issue_left_knee",
        thread_id: "thread_left_knee",
        training_review_layer_default: false,
        pt_treatment_markers: [
          {
            ...problemMarker,
            marker_id: "marker_left_quad_treatment",
            label: "股四头处理",
            marker_role: "pt_treatment_context",
            render_target: {
              kind: "region",
              view: "front",
              region_target_ids: ["bodymap_region_left_quadriceps"],
              label: "股四头处理",
            },
            source: source(["event_care"], ["draft_care"]),
          },
        ],
      },
    },
    source: source(["event_pain", "event_training", "event_care"]),
  },
  related_records: {
    groups: [
      {
        group_id: "group_left_knee_0706",
        thread_id: "thread_left_knee",
        issue_id: "issue_left_knee",
        date: "2026-07-06",
        display_title: "跑步后左膝记录",
        narrative_role: "最近记录",
        scene_title: "跑步后左膝反应与调整",
        group_kind: "first_screen_narrative_evidence",
        records: [
          relatedRecord("context", "出现情境", "跑步训练", "event_training"),
          relatedRecord("adjustment_intervention", "处理/调整", "调整落地方式", "event_care"),
          relatedRecord("body_reaction", "身体反应", "跑步时左膝疼痛", "event_pain"),
          relatedRecord("followup_outcome", "结果/跟进", "当日缓解", "event_outcome"),
        ],
        unresolved_item_ids: ["unresolved_left_knee"],
        source: source(
          ["event_training", "event_care", "event_pain", "event_outcome"],
          ["draft_group"],
        ),
      },
    ],
    source: source(["event_training", "event_care", "event_pain", "event_outcome"]),
  },
}

function relatedRecord(slot, roleLabel, summary, eventId) {
  return {
    slot,
    date: "2026-07-06",
    event_ids: [eventId],
    role_label: roleLabel,
    title: roleLabel,
    summary,
    followup_status: "已记录",
    care_classifications: [],
    source: source([eventId], [`draft_${eventId}`]),
  }
}

function argValue(name) {
  const index = process.argv.indexOf(name)
  if (index === -1) return null
  const value = process.argv[index + 1]
  assert(value, `${name} requires a file path.`)
  return value
}

const apiResponsePath = argValue("--api-response")
const usingExternalApiResponse = Boolean(apiResponsePath)
const response = apiResponsePath
  ? JSON.parse(await readFile(path.resolve(process.cwd(), apiResponsePath), "utf8"))
  : apiResponse
const context = buildPTReviewContextFromApi(response)
const focusIssueId = usingExternalApiResponse ? context.topBodyIssues[0]?.id : "issue_left_knee"
assert(focusIssueId, "API response should provide at least one focusable issue.")
const focus = resolveFocus(context, { kind: "issue", id: focusIssueId })

assert(context.topBodyIssues.length > 0, "API issue cards should become top body issues.")
assert(context.topBodyIssues.length <= 3, "First screen must contain at most three issue cards.")
assert(context.bodyMap.markers.length > 0, "API body-map markers should be preserved.")
assert(focus.evidenceGroups.length > 0, "Related Records should render from the first-screen DTO.")
assert(response.data_status === "official_history", "Validation response should come from Official History.")
assert(context.bodyMap.problemLocationsLocked === true, "Problem locations must be locked on.")
assert(context.bodyMap.trainingReviewDefaultVisible === false, "Training review must default off.")

const visibleIssueText = JSON.stringify(
  context.topBodyIssues.map((issue) => ({
    label: issue.label,
    whyItMatters: issue.whyItMatters,
    microContext: issue.microContext,
  })),
)
assert(!visibleIssueText.toLowerCase().includes("undefined"), "Issue fields must not render undefined.")
assert(!visibleIssueText.includes("thread_"), "Issue fields must not expose raw thread ids.")
assert(!visibleIssueText.includes("条相关记录"), "Issue fields must not use generic record-count summaries.")

assert(
  context.evidenceGroups.every((group) => {
    const kinds = group.slots.map((slot) => slot.kind)
    return kinds.length > 0 && kinds.length <= 4 && new Set(kinds).size === kinds.length
  }),
  "Related Records groups must preserve compact, unique narrative slots.",
)
assert(
  context.evidenceGroups.every((group) => group.sourceDraftIds.length > 0),
  "Related Records groups must preserve source traceability.",
)

const problemOnlyMarkers = visibleBodyMapMarkers(context, null, false)
const selectedIssueMarkers = visibleBodyMapMarkers(context, focusIssueId, false)
const trainingReviewMarkers = visibleBodyMapMarkers(context, null, true)
assert(
  problemOnlyMarkers.length > 0 && problemOnlyMarkers.every((marker) => marker.markerRole === "problem"),
  "Body Map must show only problem markers before issue selection or training review.",
)
assert(
  selectedIssueMarkers.some(
    (marker) => marker.markerRole === "pt_treatment_context" && marker.issueId === focusIssueId,
  ),
  "Selected issue must reveal only its PT treatment context.",
)
assert(
  !selectedIssueMarkers.some((marker) => marker.markerRole === "training_review"),
  "Training-review markers must remain hidden while the layer is off.",
)
assert(
  trainingReviewMarkers.some((marker) => marker.markerRole === "training_review") &&
    trainingReviewMarkers.some((marker) => marker.markerRole === "problem"),
  "Training review must add training markers without hiding problem markers.",
)

const loadSignals = [
  ...context.briefing.loadSignals.exposure,
  ...context.briefing.loadSignals.response,
]
assert(loadSignals.length > 0, "Briefing load signals should survive API adaptation.")
assert(context.briefing.unresolvedCount === response.briefing.unresolved_items.length, "Unresolved count must come from briefing.")
assert(
  context.briefing.outcomeCount ===
    (response.related_records.groups ?? []).flatMap((group) => group.records)
      .filter((record) => record.slot === "followup_outcome" && record.followup_status === "已记录").length,
  "Outcome count must come from first-screen Related Records.",
)

if (!usingExternalApiResponse) {
  const issue = context.topBodyIssues[0]
  assert(issue.label === "左膝", "Issue label should use backend display_title without title splitting.")
  assert(issue.microContext.attentionBadge === "反复出现", "Attention badge should come from backend micro_context.")
  assert(issue.microContext.relatedRecordCount === 3, "Related-record count should come from backend micro_context.")
  assert(
    focus.evidenceGroups[0]?.slots.map((slot) => slot.kind).join(",") ===
      "context,adjustment,presentation,follow_up",
    "All four first-screen evidence roles should preserve their order.",
  )
  assert(
    focus.evidenceGroups[0]?.slots.every((slot) => slot.eventIds.every((id) => id.startsWith("event_"))),
    "Related Records must keep source event ids without mapping through Timeline cell ids.",
  )
} else {
  const leftKnee = context.topBodyIssues.find((issue) => issue.id === "issue_left_knee")
  assert(leftKnee, "Golden API response must expose the left-knee issue.")

  const issueFocus = resolveFocus(context, { kind: "issue", id: leftKnee.id })
  assert(
    issueFocus.evidenceGroups.map((group) => group.date).join(",") ===
      "2026-07-01,2026-07-06,2026-07-07,2026-07-09",
    "Left-knee card focus must expose all four dated groups in older-to-newer order.",
  )

  const markerId = leftKnee.relatedMarkerIds[0]
  assert(markerId, "Left-knee issue must expose a selectable problem marker.")
  const markerFocus = resolveFocus(context, { kind: "marker", id: markerId })
  assert(
    JSON.stringify(markerFocus.evidenceGroups) === JSON.stringify(issueFocus.evidenceGroups),
    "Left-knee issue card and problem marker must resolve identical rendered records.",
  )

  for (const group of issueFocus.evidenceGroups) {
    assert(group.id && group.issueId && group.date, "Every API Related Records group needs stable identity.")
    assert(group.roleLabel && group.slots.length > 0, "Every API Related Records group needs a narrative role and evidence slots.")
    assert(group.sourceDraftIds.length > 0, "Every API Related Records group needs source traceability.")
  }

  const leftAnkle = context.topBodyIssues.find((issue) => issue.id === "issue_left_ankle")
  if (leftAnkle) {
    const ankleFocus = resolveFocus(context, { kind: "issue", id: leftAnkle.id })
    const ankleText = ankleFocus.evidenceGroups
      .flatMap((group) => group.slots.map((slot) => slot.text))
      .join("\n")
    assert(!ankleText.includes("左膝"), "Left-ankle focus must not render the same-run left-knee reaction.")
    assert(
      ankleFocus.evidenceGroups.every(
        (group) => !group.sourceDraftIds.includes("draft_golden_20260706_pain_left_knee_run"),
      ),
      "Left-ankle groups must not own the same-day left-knee reaction source.",
    )
  }
}

console.log("PASS PT Review first-screen API context validation")

const emptyContext = buildPTReviewContextFromApi({
  ...apiResponse,
  data_status: "empty",
  briefing: {
    summary: "当前区间暂无已确认记录。",
    load_signals: [],
    unresolved_items: [],
    source: { source_event_ids: [], source_draft_ids: [] },
  },
  issue_cards: [],
  body_map: {
    ...apiResponse.body_map,
    markers: [],
    selected_issue_contexts: {},
  },
  related_records: { groups: [], source: { source_event_ids: [], source_draft_ids: [] } },
})
assert(emptyContext.defaultFocusSuggestion.kind === "none", "Empty response must use an explicit empty focus.")
assert(resolveFocus(emptyContext, { kind: "none" }).evidenceGroups.length === 0, "Empty focus must not manufacture Related Records.")
