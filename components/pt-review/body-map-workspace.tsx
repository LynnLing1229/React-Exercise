"use client"

import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { Dumbbell } from "lucide-react"
import {
  EVENT_STYLE,
  visibleBodyMapMarkers,
  type EventType,
  type Focus,
  type PTReviewContext,
  type ResolvedFocus,
} from "@/src/features/pt-review/review-context"
import { BodyMapFigure } from "./body-map-figure"
import { bodyMapTargetsOverlap } from "./body-map-targets"
import { SectionTitle } from "./ui"

type ViewId = "front" | "back"

const SUPPORTED_VIEWS = new Set(["front", "back"])

export function BodyMapWorkspace({
  context,
  resolved,
  onFocus,
}: {
  context: PTReviewContext
  resolved: ResolvedFocus
  onFocus: (focus: Focus) => void
}) {
  const focusedView = useMemo<ViewId>(() => {
    const firstMarkerId = [...resolved.markerIds][0]
    const marker = context.bodyMap.markers.find((item) => item.id === firstMarkerId)
    return marker?.view === "back" ? "back" : "front"
  }, [context.bodyMap.markers, resolved.markerIds])

  const [view, setView] = useState<ViewId>(focusedView)
  const [selectionCleared, setSelectionCleared] = useState(false)
  const [trainingReviewVisible, setTrainingReviewVisible] = useState(
    context.bodyMap.trainingReviewDefaultVisible ?? false,
  )
  const [selectedTrainingMarkerId, setSelectedTrainingMarkerId] = useState<string | null>(null)
  const focusKey = resolved.focus.kind === "none"
    ? "none"
    : `${resolved.focus.kind}:${resolved.focus.id}`

  useEffect(() => {
    setView(focusedView)
  }, [focusedView])

  useEffect(() => {
    setSelectionCleared(false)
  }, [resolved.focus])

  useEffect(() => {
    setSelectedTrainingMarkerId((current) => {
      if (!current) return null
      const trainingTarget = context.bodyMap.markers.find(
        (marker) => marker.id === current,
      )?.renderTarget
      if (!trainingTarget) return null
      const remainsCompatible = [...resolved.markerIds].some((markerId) => {
        const issueTarget = context.bodyMap.markers.find(
          (marker) => marker.id === markerId,
        )?.renderTarget
        return issueTarget && bodyMapTargetsOverlap(trainingTarget, issueTarget)
      })
      return remainsCompatible ? current : null
    })
  }, [focusKey])

  const visibleMarkers = visibleBodyMapMarkers(
    context,
    resolved.issueId,
    trainingReviewVisible,
  )
  const renderedMarkers = selectionCleared
    ? visibleMarkers.filter((marker) => marker.markerRole !== "pt_treatment_context")
    : visibleMarkers
  const markersOnView = renderedMarkers.filter((marker) => marker.view === view)
  const visibleMarkerIds = new Set(renderedMarkers.map((marker) => marker.id))
  const issueMarkerIds = selectionCleared
    ? new Set<string>()
    : new Set([...resolved.markerIds].filter((markerId) => visibleMarkerIds.has(markerId)))
  const displayedMarkerIds = new Set(issueMarkerIds)
  if (selectedTrainingMarkerId && visibleMarkerIds.has(selectedTrainingMarkerId)) {
    displayedMarkerIds.add(selectedTrainingMarkerId)
    const selectedTrainingTarget = visibleMarkers.find(
      (marker) => marker.id === selectedTrainingMarkerId,
    )?.renderTarget
    if (selectedTrainingTarget) {
      for (const marker of visibleMarkers) {
        if (
          marker.markerRole === "problem" &&
          marker.renderTarget &&
          bodyMapTargetsOverlap(selectedTrainingTarget, marker.renderTarget)
        ) {
          displayedMarkerIds.add(marker.id)
        }
      }
    }
  }
  const anyActive = displayedMarkerIds.size > 0
  const selectedTrainingMarker = selectedTrainingMarkerId
    ? context.bodyMap.markers.find((marker) => marker.id === selectedTrainingMarkerId) ?? null
    : null
  const bodyViews = context.bodyMap.views.filter((bodyView) =>
    SUPPORTED_VIEWS.has(bodyView.id),
  )

  function toggleTrainingReview() {
    if (trainingReviewVisible) {
      setSelectedTrainingMarkerId(null)
    }
    setTrainingReviewVisible((current) => !current)
  }

  function selectView(nextView: ViewId) {
    setView(nextView)
    setSelectedTrainingMarkerId(null)
  }

  return (
    <div className="flex h-full flex-col gap-2 p-3">
      <div className="flex items-start justify-between gap-3">
        <SectionTitle>身体热区图</SectionTitle>

        <div className="flex shrink-0 gap-1 rounded-md bg-muted p-0.5">
          {bodyViews.map((bodyView) => {
            const count = context.bodyMap.markers.filter(
              (marker) => marker.markerRole === "problem" && marker.view === bodyView.id,
            ).length
            const active = bodyView.id === view
            return (
              <button
                key={bodyView.id}
                type="button"
                data-body-map-view={bodyView.id}
                onClick={() => selectView(bodyView.id === "back" ? "back" : "front")}
                className={cn(
                  "rounded-[5px] px-2 py-1 text-[11px] font-medium leading-none transition-colors",
                  active
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {bodyView.label}
                <span
                  className={cn(
                    "ml-1 text-[10px]",
                    active ? "text-primary" : "text-muted-foreground/70",
                  )}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        {(["pain", "training", "intervention", "outcome"] as EventType[]).map(
          (type) => (
            <span key={type} className="inline-flex items-center gap-1">
              <span className={cn("size-1.5 rounded-full", EVENT_STYLE[type].dot)} aria-hidden />
              {compactEventLabel(type)}
            </span>
          ),
        )}
        <button
            type="button"
            data-training-review-toggle
            role="switch"
            aria-checked={trainingReviewVisible}
            onClick={toggleTrainingReview}
            className={cn(
              "ml-auto inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-medium transition-colors",
              trainingReviewVisible
                ? "border-event-training/50 bg-event-training-soft text-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            <Dumbbell className="size-3" aria-hidden />
            训练负荷
        </button>
      </div>

      <div className="relative mx-auto aspect-[67/93] w-full max-w-[300px] flex-none lg:min-h-0 lg:max-w-[340px] lg:flex-1 lg:aspect-auto">
        <BodyMapFigure
          view={view}
          markers={markersOnView}
          selectedMarkerIds={displayedMarkerIds}
          primarySelectedMarkerId={selectedTrainingMarkerId}
          anyActive={anyActive}
          onMarkerSelect={(marker) => {
            setSelectionCleared(false)
            if (marker.markerRole === "training_review") {
              setSelectedTrainingMarkerId((current) => current === marker.id ? null : marker.id)
              return
            }
            const target = marker.renderTarget
            const overlappingTrainingMarker = target && trainingReviewVisible
              ? markersOnView.find(
                  (candidate) =>
                    candidate.markerRole === "training_review" &&
                    candidate.renderTarget &&
                    bodyMapTargetsOverlap(target, candidate.renderTarget),
                )
              : null
            setSelectedTrainingMarkerId(overlappingTrainingMarker?.id ?? null)
            onFocus(
              marker.markerRole === "pt_treatment_context" && marker.issueId
                ? { kind: "issue", id: marker.issueId }
                : { kind: "marker", id: marker.id },
            )
          }}
          onClearSelection={() => {
            setSelectedTrainingMarkerId(null)
            setSelectionCleared(true)
          }}
          className="absolute inset-0 size-full"
        />

        {markersOnView.length === 0 ? (
          <p className="absolute inset-x-0 bottom-2 text-center text-[11px] text-muted-foreground">
            该视图暂无当前区间热区
          </p>
        ) : null}

        {selectedTrainingMarker?.trainingLoad ? (
          <TrainingLoadDetail
            marker={selectedTrainingMarker}
          />
        ) : null}
      </div>
    </div>
  )
}

function TrainingLoadDetail({
  marker,
}: {
  marker: PTReviewContext["bodyMap"]["markers"][number]
}) {
  const load = marker.trainingLoad
  if (!load) return null
  const visibleExercises = load.exercises.slice(0, 3)
  const remainingExercises = load.exercises.slice(3)
  const remainingKnownSets = remainingExercises.reduce(
    (total, exercise) => total + (exercise.knownSets ?? 0),
    0,
  )

  return (
    <div
      data-training-load-detail={load.muscleId}
      className="pointer-events-none absolute bottom-1 left-0 z-10 flex h-[116px] w-[120px] flex-col overflow-hidden p-1.5 text-[10.5px] lg:h-[136px] lg:w-[128px]"
    >
      <div className="flex shrink-0 items-center">
        <p
          data-training-load-header
          className="min-w-0 flex-1 truncate whitespace-nowrap text-[11px] font-semibold text-foreground"
        >
          {load.muscleLabel}
          <span className="ml-1 text-event-training">
            {load.knownSetCount > 0 ? `${load.knownSetCount}组` : "组数不详"}
          </span>
        </p>
      </div>
      <ul className="mt-1 space-y-0.5 border-t border-border/40 pt-1 text-muted-foreground">
        {visibleExercises.map((exercise, index) => (
          <li
            key={`${exercise.sourceEventIds[0] ?? "fixture"}-${exercise.exerciseLabel}-${index}`}
            data-training-load-exercise
            data-training-load-role={exercise.role}
            className="leading-snug"
          >
            <span className="text-foreground">{exercise.exerciseLabel}</span>
            <span className="ml-1">
              {exercise.knownSets ? `${exercise.knownSets}组` : "组数不详"}
            </span>
          </li>
        ))}
      </ul>
      {remainingExercises.length > 0 ? (
        <p
          data-training-load-overview-summary
          className="mt-0.5 shrink-0 leading-snug text-muted-foreground"
        >
          其它 {remainingExercises.length} 个动作
          {remainingKnownSets > 0 ? ` 共 ${remainingKnownSets}组` : " 组数不详"}
        </p>
      ) : null}
    </div>
  )
}

function compactEventLabel(type: EventType) {
  if (type === "pain") return "疼痛"
  if (type === "intervention") return "处理"
  if (type === "outcome") return "结果"
  return EVENT_STYLE[type].label
}
