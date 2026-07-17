/**
 * Design handoff only.
 *
 * These objects are compact, frontend-shaped props for v0 visual exploration.
 * They are not an API DTO, persistence schema, runtime fixture, or statement of
 * the Owner's complete clinical history. Nothing under web/ imports this file.
 */

const ownerObservation = {
  origin: "owner_observation",
  representation: "ai_summary_of_owner_text",
  review: "owner_source_checked",
  displayLabel: "Owner 记录，已核对来源",
} as const

const ownerParaphraseOfPt = {
  origin: "owner_paraphrase_of_pt",
  representation: "ai_summary_of_owner_text",
  review: "owner_source_checked",
  displayLabel: "Owner 转述 PT；不是 PT 已确认判断",
} as const

const realEvidence = [
  {
    key: "run-and-knee-presentation-0710",
    date: "2026-07-10",
    role: "presentation_and_training_exposure",
    title: "跑步后半程出现轻微左膝不适",
    detail: "后半程断续出现，跑后步行最初 1 分钟仍有感觉，后来消失。右膝也短暂疼痛一两次但未持续。",
    focusMembership: "selected_episode",
    source: ownerObservation,
    cautions: ["不把同日双膝表现合并成一个问题", "不根据先后关系推断原因"],
  },
  {
    key: "training-and-mobility-0712",
    date: "2026-07-12",
    role: "training_exposure",
    title: "力量、跑步与下肢拉伸",
    detail: "完成上肢力量训练、一次未记录距离和时长的跑步，以及睡前下肢拉伸和简单泡沫轴放松。",
    focusMembership: "context_only",
    source: ownerObservation,
    missing: "跑步后的膝部或小腿反应未记录",
  },
  {
    key: "external-knee-impact-0713",
    date: "2026-07-13",
    role: "presentation_action_and_response",
    title: "左膝受到外部碰撞后短暂疼痛",
    detail: "Owner 进行了冰敷，之后已无明显感觉。只保留时间顺序，不声称冰敷造成恢复。",
    focusMembership: "selected_concern_context",
    source: ownerObservation,
  },
  {
    key: "core-training-0714",
    date: "2026-07-14",
    role: "training_exposure",
    title: "核心力量训练",
    detail: "完成平板支撑、侧身平板、高位平板触肩和两种死虫式练习。",
    focusMembership: "context_only",
    source: ownerObservation,
  },
  {
    key: "owner-recorded-pt-visit-0715",
    date: "2026-07-15",
    role: "performed_pt_action",
    title: "康复师到访：治疗与指导练习已记录",
    detail: "左大腿外侧和后外侧接受手法处理；左大腿接受冲击波；左膝内侧区域接受超声波；随后完成六项指导练习。",
    focusMembership: "visit_has_selected_focus_but_steps_are_specific",
    source: ownerParaphraseOfPt,
    immediateResponse: "Owner 记录部分手法、冲击波和超声波处理时疼痛。",
    delayedResponse: null,
    reasoningRestated: false,
  },
] as const

export const decisionWorkbenchV0SampleData = {
  realReasoningGap: {
    scenario: {
      label: "真实主状态：证据丰富，PT 推理缺失",
      truthStatus: "derived_from_refreshed_local_evidence",
      prototypeOnly: true,
    },
    reviewFocus: {
      kind: "care_concern",
      label: "左膝疼痛",
      whyNow: "7 月 15 日刚完成一次针对左膝及相关大腿区域的康复师处理，但处理目的、计划和后续判断条件未记录。",
      priority: "本次需要讨论",
    },
    careConcern: {
      label: "左膝疼痛",
      continuity: "同一持续关注的问题；跑步、碰撞和其他触发属于不同日期的 Presentation。",
      currentState: "仍需复核",
    },
    careEpisode: {
      label: "7 月左膝评估与管理过程",
      lifecycle: "open",
      displayLifecycle: "Open",
      startDate: "2026-07-01",
      startReason: "左膝成为明确的治疗和持续复核重点",
      conclusion: null,
      membership: "design-scenario association; not inferred from date or body overlap alone",
    },
    goal: {
      state: "not_captured",
      display: "尚未记录可评估 Goal",
    },
    currentPresentation: {
      recordedThrough: "2026-07-15",
      summary: "7 月 10 日跑步后半程和跑后短时间有轻微、间歇性左膝不适，后来消失；7 月 15 日到访前仍因这段期间的左膝不适接受处理。",
      latestKnownState: "7 月 15 日处理后的症状状态尚未记录",
      source: ownerObservation,
    },
    mostRecentlyRecordedPtView: {
      state: "not_captured",
      display: "PT Assessment 未捕获",
      warning: "不能根据治疗部位或方式推断 PT 判断",
    },
    mostRecentlyRecordedPlan: {
      state: "not_captured",
      display: "Plan 及其目的未捕获",
      applicability: "unknown",
    },
    decisionCondition: {
      state: "not_captured",
      display: "尚未记录下一步依据什么信号判断",
    },
    reasoningFreshness: {
      state: "review_point_unknown",
      display: "PT 看过哪些证据不明确",
    },
    reviewEvidence: realEvidence,
    latestVisit: {
      date: "2026-07-15",
      source: ownerParaphraseOfPt,
      selectedFocusSteps: ["手法处理左大腿外侧及后外侧", "冲击波处理左大腿区域", "超声波处理左膝内侧区域"],
      visitContextSteps: ["溜冰式", "侧向分腿", "壶铃摇摆", "TRX 划船", "俯卧斜板拉自己", "瑜伽球四点支撑平衡"],
      membershipNote: "治疗步骤有明确左膝/左大腿语境；不能只因同一次 Visit 就把每个练习自动归入左膝 Episode。",
      planRestated: false,
      assessmentRestated: false,
    },
    nearbyEvidenceOutsideEpisode: [
      {
        date: "2026-07-11",
        title: "左小腿后侧短暂不适",
        detail: "穿袜动作时出现牵扯和轻微异常感觉，第二天早上已无感觉。",
        membership: "not_assigned_to_left_knee_episode",
        reason: "短暂症状且没有成为评估或管理重点；不自动创建 Care Episode。",
        source: ownerObservation,
      },
    ],
    missingness: [
      { kind: "assessment", label: "PT 如何理解左膝问题尚未记录" },
      { kind: "plan_purpose", label: "本次处理想改变什么尚未记录" },
      { kind: "goal", label: "可评估 Goal 尚未记录" },
      { kind: "decision_condition", label: "继续、调整或复核的判断条件尚未记录" },
      { kind: "delayed_response", label: "7 月 15 日处理后当天晚些时候和次日反应待补充" },
    ],
    nextDecision: {
      ownerFacingQuestion: "这次处理后出现了什么变化？",
      ptFacingQuestion: "当前工作判断、下一阶段 Plan，以及需要观察的变化和复核条件分别是什么？",
      systemBoundary: "问题由系统整理；系统不选择继续、调整或停止。",
    },
  },

  syntheticReasoningCaptured: {
    scenario: {
      label: "纯设计 Mock：已捕获 PT 推理",
      truthStatus: "synthetic_not_owner_history",
      prototypeOnly: true,
      visibleWarning: "以下 PT View、Goal、Plan 和 Decision Condition 均为界面设计示例。",
    },
    reviewFocus: {
      kind: "care_concern",
      label: "左膝疼痛",
      whyNow: "已有较早的 PT 判断和 Plan，但之后出现新训练、症状记录和一次未重述推理的 Visit。",
      priority: "需要复核较早方向是否仍适用",
    },
    careEpisode: {
      label: "7 月左膝评估与管理过程",
      lifecycle: "open",
      displayLifecycle: "Open",
      startDate: "2026-07-01",
      conclusion: null,
    },
    goal: {
      state: "recorded",
      label: "完成一次常规跑步后及次日不出现影响活动的左膝不适",
      progress: "not_yet_reviewed",
      provenance: "synthetic PT-confirmed design example",
    },
    mostRecentlyRecordedPtView: {
      state: "recorded",
      effectiveDate: "2026-07-10",
      summary: "跑步相关表现仍需结合跑后和次日反应继续观察；当前记录不支持把症状归因于单一原因。",
      source: {
        origin: "direct_pt_audio",
        representation: "ai_summary",
        review: "pt_reviewed_and_accepted",
        displayLabel: "PT 已确认",
        reference: "Mock PT audio · 00:24–00:51",
      },
    },
    mostRecentlyRecordedPlan: {
      state: "recorded",
      effectiveDate: "2026-07-10",
      summary: "维持当时讨论的跑步级别，并记录跑后及次日的左膝反应；复核后再决定是否改变安排。",
      applicability: "until_next_review_or_condition_match",
      sourceLabel: "PT 已确认 · 纯设计 Mock",
    },
    decisionCondition: {
      state: "recorded",
      naturalLanguage: "如果不适持续到次日上午或开始影响日常活动，下次复核时重新评估训练安排。",
      possibleLaterEvidence: "7 月 12 日跑步后反应未记录，不能判断条件是否出现。",
      systemStatus: "possible_match_unknown_pending_pt_review",
      systemBoundary: "系统只关联证据，不宣布条件已经满足，也不发出训练指令。",
    },
    reasoningFreshness: {
      state: "later_evidence_pending_pt_review",
      reviewedThrough: "2026-07-10",
      laterEvidenceDates: ["2026-07-12", "2026-07-13", "2026-07-14", "2026-07-15"],
      display: "有 4 天的新证据尚待 PT 复核",
    },
    planVersusExecution: {
      plan: "记录每次跑步后的即时和次日反应。",
      actual: "7 月 12 日跑步已记录，但跑后和次日反应没有记录。",
      interpretation: "执行信息不完整；不修改原 Plan，也不判断 Owner 是否遵从。",
    },
    laterVisitWithoutRestatedReasoning: {
      date: "2026-07-15",
      performedActions: "手法、冲击波、超声波和六项指导练习已记录。",
      assessmentRestated: false,
      planRestated: false,
      display: "本次有 Action，但 PT reasoning 未重述；7 月 10 日仍是最近记录的 PT View，不代表当前仍适用。",
      source: ownerParaphraseOfPt,
    },
    unresolvedSourceConflict: {
      olderStrongerStatement: "PT 已确认的 7 月 10 日 View",
      newerWeakerStatement: "Mock Owner 后续转述：康复师似乎认为可以直接增加训练",
      resolution: "do_not_supersede",
      display: "来源强度不同且没有明确 supersession，需要澄清。",
    },
    multiFocusVisitExample: {
      visitLabel: "纯设计 Mock：一次 Visit 涉及多个 Focus",
      focuses: ["左膝疼痛", "恢复稳定跑步 Goal"],
      stepMembership: [
        { step: "左膝超声波处理", belongsTo: ["左膝疼痛"] },
        { step: "跑步动作复核", belongsTo: ["左膝疼痛", "恢复稳定跑步 Goal"] },
        { step: "上肢 TRX 划船", belongsTo: [], note: "Visit context only; do not propagate to either Focus without confirmation" },
      ],
    },
    reviewEvidence: realEvidence,
    nextDecision: {
      question: "较早的 PT View 和 Plan 是否继续、需要调整，还是应先补充评估？",
      status: "requires_pt_review",
      prohibitedSystemAction: "系统不能替 PT 选择继续、调整、停止或转诊。",
    },
  },
} as const
