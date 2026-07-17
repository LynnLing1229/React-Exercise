"use client"

import { useLayoutEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import {
  EVENT_STYLE,
  type BodyMapMarker,
  type BodyMapRenderTarget,
  type EventType,
} from "@/src/features/pt-review/review-context"
import {
  BACK_MUSCLES,
  FRONT_MUSCLES,
  type BodyMusclePath,
} from "@/src/vendor/body-muscles"
import { pathIdsForRegionTargets } from "./body-map-targets"

type ViewId = "front" | "back"

const BODY_BOUNDS = {
  front: { x: 0, y: 0, width: 35, height: 93 },
  back: { x: 37, y: 0, width: 35, height: 93 },
} satisfies Record<ViewId, { x: number; y: number; width: number; height: number }>

const VIEWBOX = {
  front: { x: -16, y: 0, width: 67, height: 93 },
  back: { x: 21, y: 0, width: 67, height: 93 },
} satisfies Record<ViewId, { x: number; y: number; width: number; height: number }>

const EVENT_COLOR: Record<EventType, string> = {
  training: "var(--event-training)",
  pain: "var(--event-pain)",
  pt_visit: "var(--event-pt-visit)",
  intervention: "var(--event-intervention)",
  outcome: "var(--event-outcome)",
  note: "var(--event-note)",
}

type RenderTarget = BodyMapRenderTarget

export function BodyMapFigure({
  view,
  markers,
  selectedMarkerIds,
  primarySelectedMarkerId,
  anyActive,
  onMarkerSelect,
  onClearSelection,
  className,
}: {
  view: ViewId
  markers: BodyMapMarker[]
  selectedMarkerIds: Set<string>
  primarySelectedMarkerId?: string | null
  anyActive: boolean
  onMarkerSelect: (marker: BodyMapMarker) => void
  onClearSelection: () => void
  className?: string
}) {
  const box = VIEWBOX[view]
  const svgRef = useRef<SVGSVGElement>(null)
  const [keyboardFocusedMarkerId, setKeyboardFocusedMarkerId] = useState<string | null>(null)
  const [pathAnchors, setPathAnchors] = useState<Record<string, PathAnchor>>({})
  const musclePaths = view === "front" ? FRONT_MUSCLES : BACK_MUSCLES
  const pathById = new Map(musclePaths.map((path) => [path.id, path]))
  const hitOrderedMarkers = markers.slice().sort(
    (left, right) => markerHitOrder(left) - markerHitOrder(right),
  )

  useLayoutEffect(() => {
    const anchors: Record<string, PathAnchor> = {}
    for (const path of svgRef.current?.querySelectorAll<SVGGraphicsElement>("[data-anatomy-path]") ?? []) {
      const bounds = path.getBBox()
      const id = path.dataset.anatomyPath
      if (!id || !Number.isFinite(bounds.x) || !Number.isFinite(bounds.y)) continue
      anchors[id] = {
        x: bounds.x + bounds.width / 2,
        y: bounds.y + bounds.height / 2,
      }
    }
    setPathAnchors(anchors)
  }, [view])
  const selectedMarker =
    markers.find((marker) => marker.id === primarySelectedMarkerId) ??
    markers.find((marker) => selectedMarkerIds.has(marker.id)) ??
    null
  const selectedTarget = selectedMarker ? renderTargetFor(selectedMarker) : null
  const selectedProblemItems = primarySelectedMarkerId && selectedTarget
    ? markers
        .filter(
          (marker) =>
            marker.markerRole === "problem" &&
            marker.id !== selectedMarker?.id &&
            selectedMarkerIds.has(marker.id),
        )
        .flatMap((marker) => {
          const target = renderTargetFor(marker)
          return target ? [{ marker, target, context: false }] : []
        })
    : []
  const calloutItems = [
    ...(selectedMarker && selectedTarget
      ? [{ marker: selectedMarker, target: selectedTarget, context: false }]
      : []),
    ...selectedProblemItems,
    ...markers
      .filter(
        (marker) =>
          marker.markerRole === "pt_treatment_context" &&
          marker.id !== selectedMarker?.id,
      )
      .flatMap((marker) => {
        const target = renderTargetFor(marker)
        return target ? [{ marker, target, context: true }] : []
      }),
  ]
  const callouts = calloutLayouts(calloutItems, view, pathAnchors)

  return (
    <svg
      ref={svgRef}
      data-body-map-figure
      viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`}
      className={className}
      role="group"
      aria-label={viewLabel(view)}
      onClick={onClearSelection}
    >
      <defs>
        <filter id={`body-map-glow-${view}`} x="-35%" y="-35%" width="170%" height="170%">
          <feGaussianBlur stdDeviation="0.9" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <MuscleBase paths={musclePaths} />

      {hitOrderedMarkers.map((marker) => {
        const selected = selectedMarkerIds.has(marker.id)
        const keyboardFocused = keyboardFocusedMarkerId === marker.id
        const dimmed = anyActive && !selected && !keyboardFocused
        const color = EVENT_COLOR[marker.primaryEventType]
        const target = renderTargetFor(marker)
        if (!target) return null

        return (
          <g
            key={marker.id}
            role="button"
            tabIndex={0}
            data-body-map-marker={marker.id}
            data-marker-role={marker.markerRole ?? "problem"}
            data-marker-issue={marker.issueId}
            data-training-heat-level={marker.trainingLoad
              ? marker.trainingLoad.heatLevel ?? "unknown"
              : undefined}
            aria-label={`${marker.label}，${relatedRecordCount(marker)} 条相关记录，${EVENT_STYLE[marker.primaryEventType].label}`}
            aria-pressed={selected}
            className={cn(
              "cursor-pointer transition-opacity focus:outline-none",
              dimmed && target.emphasis !== "context"
                ? "opacity-45 hover:opacity-85"
                : "opacity-100",
            )}
            onClick={(event) => {
              event.stopPropagation()
              onMarkerSelect(marker)
            }}
            onFocus={() => setKeyboardFocusedMarkerId(marker.id)}
            onBlur={() => setKeyboardFocusedMarkerId(null)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                onMarkerSelect(marker)
              }
            }}
          >
            <RenderTargetShape
              target={target}
              color={color}
              selected={selected || keyboardFocused}
              dimmed={dimmed}
              view={view}
              pathById={pathById}
              trainingHeatLevel={marker.trainingLoad
                ? marker.trainingLoad.heatLevel
                : undefined}
            />
          </g>
        )
      })}

      {callouts.map((callout) => (
        <SelectedCallout key={`${callout.marker.id}-callout`} callout={callout} />
      ))}
    </svg>
  )
}

function MuscleBase({ paths }: { paths: BodyMusclePath[] }) {
  return (
    <g data-body-map-anatomy aria-hidden="true">
      {paths.map((path) => (
        <path
          key={path.id}
          data-anatomy-path={path.id}
          d={path.path}
          className="fill-muted stroke-card"
          strokeWidth="0.08"
          opacity="0.98"
        />
      ))}
    </g>
  )
}

type HotspotShape = {
  cx: number
  cy: number
  rx: number
  ry: number
  rotate?: number
}

function RenderTargetShape({
  target,
  color,
  selected,
  dimmed,
  view,
  pathById,
  trainingHeatLevel,
}: {
  target: RenderTarget
  color: string
  selected: boolean
  dimmed: boolean
  view: ViewId
  pathById: Map<string, BodyMusclePath>
  trainingHeatLevel?: number | null
}) {
  if (target.kind === "region") {
    const pathIds = pathIdsForRegionTargets(target.regionTargetIds)
    return (
      <g>
        {pathIds.map((regionId) => {
          const path = pathById.get(regionId)
          if (!path) return null
          const context = target.emphasis === "context"
          const training = trainingHeatLevel !== undefined
          const fillOpacity = training
            ? trainingHeatOpacity(trainingHeatLevel, selected)
            : context
              ? selected
                ? 0.28
                : 0.13
              : selected
                ? 0.54
                : 0.32
          const strokeOpacity = training
            ? selected
              ? 0.9
              : trainingHeatLevel === null
                ? 0.38
                : 0.58
            : context
              ? selected
                ? 0.62
                : 0.34
              : selected
                ? 1
                : 0.76
          return (
            <path
              key={regionId}
              data-rendered-anatomy-path={regionId}
              data-training-heat-shape={training ? "true" : undefined}
              d={path.path}
              fill={color}
              stroke={color}
              fillOpacity={fillOpacity}
              strokeOpacity={strokeOpacity}
              strokeWidth={selected && (!context || training) ? 0.42 : 0.22}
              strokeDasharray={training && trainingHeatLevel === null ? "0.7 0.45" : undefined}
              filter={selected && (!context || training) ? `url(#body-map-glow-${view})` : undefined}
              opacity={dimmed && !context ? 0.55 : 1}
            />
          )
        })}
      </g>
    )
  }

  const shape = targetShape(view, target)
  const training = trainingHeatLevel !== undefined
  return (
    <g opacity={dimmed ? 0.58 : 1}>
      {pathIdsForRegionTargets(target.referenceRegionTargetIds ?? []).map((regionId) => {
        const path = pathById.get(regionId)
        if (!path) return null
        return (
          <path
            key={regionId}
            d={path.path}
            fill={color}
            stroke={color}
            fillOpacity={selected ? 0.32 : 0.18}
            strokeOpacity={selected ? 0.88 : 0.5}
            strokeWidth={selected ? 0.34 : 0.22}
          />
        )
      })}
      <ellipse
        data-training-heat-shape={training ? "true" : undefined}
        cx={shape.cx}
        cy={shape.cy}
        rx={target.shape === "dot" ? shape.rx : shape.rx * 0.72}
        ry={shape.ry}
        transform={
          shape.rotate
            ? `rotate(${shape.rotate} ${shape.cx} ${shape.cy})`
            : undefined
        }
        fill={color}
        fillOpacity={training ? trainingHeatOpacity(trainingHeatLevel, selected) : selected ? 0.96 : 0.88}
        stroke={training ? color : "var(--card)"}
        strokeOpacity={training ? selected ? 0.9 : trainingHeatLevel === null ? 0.38 : 0.58 : 0.9}
        strokeWidth={selected ? 0.28 : 0.22}
        strokeDasharray={training && trainingHeatLevel === null ? "0.7 0.45" : undefined}
        filter={selected ? `url(#body-map-glow-${view})` : undefined}
      />
    </g>
  )
}

function trainingHeatOpacity(level: number | null, selected: boolean): number {
  if (level === null) return selected ? 0.2 : 0.11
  const ramp = [0, 0.2, 0.32, 0.44, 0.58, 0.72]
  const boundedLevel = Math.max(1, Math.min(5, Math.round(level)))
  return Math.min(0.82, ramp[boundedLevel] + (selected ? 0.08 : 0))
}

function SelectedCallout({
  callout,
}: {
  callout: CalloutLayout
}) {
  const { marker, anchor, calloutY, context, side, textAnchor, textLines, textX, view } = callout
  const color = context
    ? EVENT_COLOR.intervention
    : EVENT_COLOR[marker.primaryEventType]
  const labelGap = 1.1
  const lineEndX = side === "left" ? textX + labelGap : textX - labelGap

  return (
    <g
      data-body-map-callout={marker.id}
      data-callout-side={side}
      aria-label={context ? `${marker.label} 上次治疗说明` : `${marker.label} 选中说明`}
      className={cn("pointer-events-none", context && "opacity-70")}
    >
      <path
        data-callout-leader
        d={`M ${anchor.x} ${anchor.y} L ${lineEndX} ${calloutY}`}
        fill="none"
        stroke={color}
        strokeOpacity="0.62"
        strokeWidth="0.28"
      />
      <circle
        cx={anchor.x}
        cy={anchor.y}
        r="0.22"
        className="fill-card"
        stroke={color}
        strokeWidth="0.22"
      />
      <text
        data-callout-text
        x={textX}
        y={calloutY + 0.92}
        textAnchor={textAnchor}
        fill={color}
        stroke="var(--card)"
        strokeWidth="0.72"
        paintOrder="stroke"
        className={cn(
          "select-none",
          marker.trainingLoad?.muscleId === "glutes" ? "text-[2.28px]" : "text-[2.45px]",
          context ? "font-medium" : "font-semibold",
        )}
      >
        {textLines.map((line, index) => (
          <tspan
            key={line}
            x={textX}
            dy={index === 0 ? 0 : 2.75}
          >
            {line}
          </tspan>
        ))}
      </text>
    </g>
  )
}

type CalloutItem = {
  marker: BodyMapMarker
  target: RenderTarget
  context: boolean
}

type CalloutLayout = CalloutItem & {
  anchor: { x: number; y: number }
  calloutY: number
  side: "left" | "right"
  textAnchor: "start" | "end"
  textLines: string[]
  textX: number
  view: ViewId
}

function calloutLayouts(
  items: CalloutItem[],
  view: ViewId,
  pathAnchors: Record<string, PathAnchor>,
): CalloutLayout[] {
  const body = BODY_BOUNDS[view]
  const raw = items.flatMap((item) => {
    if (!item.target.calloutLabel) return []
    const anchor = targetAnchor(view, item.target, pathAnchors)
    if (!anchor) return []
    const side = anchor.y >= 64
      ? "right"
      : item.target.calloutSide ??
        (anchor.x < body.x + body.width / 2 ? "left" : "right")
    const textLines = calloutTextLines(item.target.calloutLabel)
    const compactLongLabel = item.marker.trainingLoad?.muscleId === "glutes"
    return [{
      ...item,
      anchor,
      calloutY: Math.min(84, Math.max(9, anchor.y - 1.6)),
      side,
      textLines,
      textAnchor: side === "left" ? "end" : "start",
      textX: side === "left"
        ? body.x - (compactLongLabel ? 0.05 : 0.6)
        : body.x + body.width + (compactLongLabel ? 0.05 : 0.6),
      view,
    } satisfies CalloutLayout]
  })

  for (const side of ["left", "right"] as const) {
    const lane = raw
      .filter((callout) => callout.side === side)
      .sort((a, b) => a.anchor.y - b.anchor.y || a.marker.id.localeCompare(b.marker.id))
    const minimumY = 7
    const maximumBottom = 88
    let nextY = minimumY
    for (const callout of lane) {
      callout.calloutY = Math.max(callout.calloutY, nextY)
      nextY = callout.calloutY + callout.textLines.length * 2.75 + 2
    }
    const overflow = Math.max(0, nextY - maximumBottom)
    if (overflow > 0) {
      for (const callout of lane) callout.calloutY -= overflow
    }
    const topUnderflow = Math.max(0, minimumY - (lane[0]?.calloutY ?? minimumY))
    if (topUnderflow > 0) {
      for (const callout of lane) callout.calloutY += topUnderflow
    }
  }

  return raw
}

function calloutTextLines(label: string | string[]): string[] {
  if (Array.isArray(label)) return label.flatMap((line) => wrapCalloutLine(line))
  return wrapCalloutLine(label)
}

function wrapCalloutLine(line: string): string[] {
  const semanticParts = line.split("｜").filter(Boolean)
  if (semanticParts.length > 1) {
    return semanticParts.flatMap((part) => wrapCalloutLine(part))
  }

  const tokens = line.match(/\d+\s*组|./gu) ?? [line]
  const lines: string[] = []
  let current = ""
  for (const token of tokens) {
    if (Array.from(current + token).length > 8 && current) {
      lines.push(current)
      current = token
    } else {
      current += token
    }
  }
  if (current) lines.push(current)
  return lines.length > 0 ? lines : [line]
}

function renderTargetFor(marker: BodyMapMarker): RenderTarget | null {
  return marker.renderTarget ?? null
}

function targetShape(view: ViewId, target: Extract<RenderTarget, { kind: "accent" }>): HotspotShape {
  const { x, y, width, height } = BODY_BOUNDS[view]
  return {
    cx: x + target.x * width,
    cy: y + target.y * height,
    rx: target.rx,
    ry: target.ry,
    rotate: target.rotate,
  }
}

function targetAnchor(
  view: ViewId,
  target: RenderTarget,
  pathAnchors: Record<string, PathAnchor>,
): PathAnchor | null {
  if (target.kind === "accent") {
    const shape = targetShape(view, target)
    return { x: shape.cx, y: shape.cy }
  }

  if (target.calloutAnchor) {
    const { x, y, width, height } = BODY_BOUNDS[view]
    return {
      x: x + target.calloutAnchor.x * width,
      y: y + target.calloutAnchor.y * height,
    }
  }

  const anchorId = target.calloutAnchorId ?? pathIdsForRegionTargets(target.regionTargetIds)[0]
  return pathAnchors[anchorId] ?? null
}

function markerHitOrder(marker: BodyMapMarker): number {
  if (marker.markerRole === "training_review") return 0
  if (marker.markerRole === "problem") return 1
  return 2
}

function relatedRecordCount(marker: BodyMapMarker) {
  return marker.relatedEventIds.length || sumEventCounts(marker)
}

function sumEventCounts(marker: BodyMapMarker) {
  return Object.values(marker.eventTypeCounts).reduce(
    (total, count) => total + (count ?? 0),
    0,
  )
}

type PathAnchor = { x: number; y: number }

function viewLabel(view: ViewId) {
  if (view === "front") return "正面身体热区图"
  return "背面身体热区图"
}
