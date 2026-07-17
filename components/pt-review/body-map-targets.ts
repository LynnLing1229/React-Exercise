import type { BodyMapRenderTarget } from "@/src/features/pt-review/review-context"

const REGION_TARGET_PATHS: Record<string, string[]> = {
  bodymap_region_left_knee: ["knee-left"],
  bodymap_region_right_knee: ["knee-right"],
  bodymap_region_left_shoulder_front: ["shoulder-front-left"],
  bodymap_region_left_shoulder_side: ["shoulder-side-left"],
  bodymap_region_right_shoulder_front: ["shoulder-front-right"],
  bodymap_region_right_shoulder_side: ["shoulder-side-right"],
  bodymap_region_left_biceps: ["biceps-left"],
  bodymap_region_right_biceps: ["biceps-right"],
  bodymap_region_left_forearm: ["forearm-left"],
  bodymap_region_right_forearm: ["forearm-right"],
  bodymap_region_left_chest: ["chest-upper-left", "chest-lower-left"],
  bodymap_region_right_chest: ["chest-upper-right", "chest-lower-right"],
  bodymap_region_left_abs: ["abs-upper-left", "abs-lower-left"],
  bodymap_region_right_abs: ["abs-upper-right", "abs-lower-right"],
  bodymap_region_left_obliques: ["abs-upper-left"],
  bodymap_region_right_obliques: ["abs-upper-right"],
  bodymap_region_left_rectus_abdominis: [
    "rectus-abdominis-upper-left",
    "rectus-abdominis-middle-left",
    "abs-lower-left",
  ],
  bodymap_region_right_rectus_abdominis: [
    "rectus-abdominis-upper-right",
    "rectus-abdominis-middle-right",
    "abs-lower-right",
  ],
  bodymap_region_left_external_oblique: ["abs-upper-left"],
  bodymap_region_right_external_oblique: ["abs-upper-right"],
  bodymap_region_left_hip_flexor: ["hip-flexor-left"],
  bodymap_region_right_hip_flexor: ["hip-flexor-right"],
  bodymap_region_left_quadriceps: ["quads-left"],
  bodymap_region_right_quadriceps: ["quads-right"],
  bodymap_region_left_adductors: ["adductors-left"],
  bodymap_region_right_adductors: ["adductors-right"],
  bodymap_region_left_ankle: ["foot-left", "tibialis-anterior-left"],
  bodymap_region_right_ankle: ["foot-right", "tibialis-anterior-right"],
  bodymap_region_left_triceps: ["triceps-long-left", "triceps-lateral-left"],
  bodymap_region_right_triceps: ["triceps-long-right", "triceps-lateral-right"],
  bodymap_region_left_trapezius_upper: ["traps-upper-left"],
  bodymap_region_left_trapezius_mid: ["traps-mid-left"],
  bodymap_region_left_trapezius_lower: ["traps-lower-left"],
  bodymap_region_right_trapezius_upper: ["traps-upper-right"],
  bodymap_region_right_trapezius_mid: ["traps-mid-right"],
  bodymap_region_right_trapezius_lower: ["traps-lower-right"],
  bodymap_region_left_rear_deltoid: ["deltoid-rear-left"],
  bodymap_region_right_rear_deltoid: ["deltoid-rear-right"],
  bodymap_region_left_lats: ["lats-upper-left", "lats-mid-left", "lats-lower-left"],
  bodymap_region_right_lats: ["lats-upper-right", "lats-mid-right", "lats-lower-right"],
  bodymap_region_left_gluteus_medius: ["gluteus-medius-left"],
  bodymap_region_right_gluteus_medius: ["gluteus-medius-right"],
  bodymap_region_left_gluteus_maximus: ["gluteus-maximus-left"],
  bodymap_region_right_gluteus_maximus: ["gluteus-maximus-right"],
  bodymap_region_left_hamstrings: ["hamstrings-medial-left", "hamstrings-lateral-left"],
  bodymap_region_right_hamstrings: ["hamstrings-medial-right", "hamstrings-lateral-right"],
  bodymap_region_left_calf_gastroc_medial: ["calves-gastroc-medial-left"],
  bodymap_region_left_calf_gastroc_lateral: ["calves-gastroc-lateral-left"],
  bodymap_region_left_calf_soleus: ["calves-soleus-left"],
  bodymap_region_right_calf_gastroc_medial: ["calves-gastroc-medial-right"],
  bodymap_region_right_calf_gastroc_lateral: ["calves-gastroc-lateral-right"],
  bodymap_region_right_calf_soleus: ["calves-soleus-right"],
  bodymap_region_left_lower_back: ["lower-back-erectors-left", "lower-back-ql-left"],
  bodymap_region_right_lower_back: ["lower-back-erectors-right", "lower-back-ql-right"],
}

export function pathIdsForRegionTargets(regionTargetIds: string[]): string[] {
  return regionTargetIds.flatMap((targetId) => REGION_TARGET_PATHS[targetId] ?? [])
}

export function bodyMapTargetsOverlap(
  left: BodyMapRenderTarget,
  right: BodyMapRenderTarget,
): boolean {
  const rightPathIds = new Set(renderTargetPathIds(right))
  return renderTargetPathIds(left).some((pathId) => rightPathIds.has(pathId))
}

function renderTargetPathIds(target: BodyMapRenderTarget): string[] {
  if (target.kind === "region") return pathIdsForRegionTargets(target.regionTargetIds)
  return pathIdsForRegionTargets(target.referenceRegionTargetIds ?? [])
}
